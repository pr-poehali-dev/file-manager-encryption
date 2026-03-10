"""
Архив закрытых заказов и управление кодами уборки.
GET /            - список заказов
POST /           - закрытие заказа
GET /?action=codes - список кодов уборки (только для администратора)
GET /?action=check&code=X - проверить и использовать код
POST /?action=add_code - добавить код (только для администратора)
DELETE /?action=del_code&id=X - удалить код
"""
import json
import os
import psycopg2
from datetime import datetime

SCHEMA = "t_p95298898_file_manager_encrypt"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """Архив заказов + коды уборки: все операции."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")
    conn = get_conn()
    cur = conn.cursor()

    try:
        # ---- КОДЫ УБОРКИ ----
        if action == "codes" and method == "GET":
            cur.execute(
                f"SELECT id, code, used, used_at, created_at FROM {SCHEMA}.cleanup_codes ORDER BY created_at DESC"
            )
            rows = cur.fetchall()
            codes = [
                {"id": r[0], "code": r[1], "used": r[2],
                 "used_at": str(r[3]) if r[3] else None, "created_at": str(r[4])}
                for r in rows
            ]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"codes": codes})}

        if action == "check" and method == "GET":
            code = (params.get("code") or "").strip()
            if not code:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"valid": False, "error": "Код не указан"})}
            cur.execute(f"SELECT id, used FROM {SCHEMA}.cleanup_codes WHERE code=%s", (code,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"valid": False, "reason": "not_found"})}
            if row[1]:
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"valid": False, "reason": "already_used"})}
            cur.execute(
                f"UPDATE {SCHEMA}.cleanup_codes SET used=TRUE, used_at=%s WHERE id=%s",
                (datetime.now(), row[0])
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"valid": True})}

        if action == "add_code" and method == "POST":
            body = json.loads(event.get("body") or "{}")
            code = (body.get("code") or "").strip()
            if not code:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Код обязателен"})}
            cur.execute(
                f"INSERT INTO {SCHEMA}.cleanup_codes (code) VALUES (%s) RETURNING id, code, used",
                (code,)
            )
            row = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": row[0], "code": row[1], "used": row[2]})}

        if action == "del_code" and method == "DELETE":
            code_id = params.get("id")
            if not code_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id обязателен"})}
            cur.execute(f"DELETE FROM {SCHEMA}.cleanup_codes WHERE id=%s", (code_id,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"deleted": True})}

        # ---- ЗАКАЗЫ ----
        if method == "GET":
            cur.execute(
                f"""SELECT o.id, o.order_number, r.name as executor_name, o.executor_id,
                           o.closed_at, o.reward, o.confirmed, o.location_territory,
                           t.territory_name, o.cleanup_code_used, o.code_valid, o.created_at
                    FROM {SCHEMA}.order_archive o
                    LEFT JOIN {SCHEMA}.records r ON r.id = o.executor_id
                    LEFT JOIN {SCHEMA}.territories t ON t.territory_number = o.location_territory
                    ORDER BY o.created_at DESC"""
            )
            rows = cur.fetchall()
            orders = [
                {
                    "id": r[0], "order_number": r[1], "executor_name": r[2],
                    "executor_id": r[3], "closed_at": str(r[4]), "reward": r[5],
                    "confirmed": r[6], "location_territory": r[7],
                    "territory_name": r[8], "cleanup_code_used": r[9],
                    "code_valid": r[10], "created_at": str(r[11]),
                }
                for r in rows
            ]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"orders": orders})}

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            order_number = (body.get("order_number") or "").strip()
            executor_id = body.get("executor_id")
            closed_at = body.get("closed_at")
            reward = int(body.get("reward") or 0)
            confirmed = bool(body.get("confirmed", False))
            location_territory = body.get("location_territory")
            cleanup_code = (body.get("cleanup_code") or "").strip()

            if not order_number or not executor_id or not closed_at or not location_territory:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не все обязательные поля заполнены"})}

            code_valid = False
            if cleanup_code:
                cur.execute(f"SELECT id, used FROM {SCHEMA}.cleanup_codes WHERE code=%s", (cleanup_code,))
                code_row = cur.fetchone()
                if code_row and not code_row[1]:
                    cur.execute(
                        f"UPDATE {SCHEMA}.cleanup_codes SET used=TRUE, used_at=%s WHERE id=%s",
                        (datetime.now(), code_row[0])
                    )
                    code_valid = True

            if not code_valid:
                cur.execute(
                    f"UPDATE {SCHEMA}.territories SET control_level = GREATEST(0, control_level - 1) WHERE territory_number=%s",
                    (location_territory,)
                )

            cur.execute(
                f"""INSERT INTO {SCHEMA}.order_archive
                    (order_number, executor_id, closed_at, reward, confirmed, location_territory, cleanup_code_used, code_valid)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id""",
                (order_number, executor_id, closed_at, reward, confirmed,
                 location_territory, cleanup_code if cleanup_code else None,
                 code_valid if cleanup_code else None)
            )
            order_id = cur.fetchone()[0]

            if confirmed:
                cur.execute(
                    f"UPDATE {SCHEMA}.records SET successful_orders = successful_orders + 1 WHERE id=%s",
                    (executor_id,)
                )

            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": order_id, "code_valid": code_valid})}

        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}

    finally:
        cur.close()
        conn.close()
