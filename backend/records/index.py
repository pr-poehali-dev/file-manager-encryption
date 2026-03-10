"""
Управление таблицей рекордов: участники и успешные заказы.
"""
import json
import os
import psycopg2

SCHEMA = "t_p95298898_file_manager_encrypt"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """Таблица рекордов: получение, добавление, обновление, удаление участников."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET":
            cur.execute(
                f"SELECT id, name, successful_orders, created_at FROM {SCHEMA}.records ORDER BY successful_orders DESC, name ASC"
            )
            rows = cur.fetchall()
            records = [
                {"id": r[0], "name": r[1], "successful_orders": r[2], "created_at": str(r[3])}
                for r in rows
            ]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"records": records})}

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            name = (body.get("name") or "").strip()
            if not name:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Имя обязательно"})}
            cur.execute(
                f"INSERT INTO {SCHEMA}.records (name) VALUES (%s) RETURNING id, name, successful_orders, created_at",
                (name,)
            )
            row = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": row[0], "name": row[1], "successful_orders": row[2], "created_at": str(row[3])})}

        if method == "PUT":
            body = json.loads(event.get("body") or "{}")
            record_id = body.get("id")
            new_name = (body.get("name") or "").strip()
            delta = body.get("successful_orders_delta")
            set_orders = body.get("successful_orders")

            if not record_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id обязателен"})}

            if new_name:
                cur.execute(f"UPDATE {SCHEMA}.records SET name=%s WHERE id=%s", (new_name, record_id))
            if delta is not None:
                cur.execute(
                    f"UPDATE {SCHEMA}.records SET successful_orders = successful_orders + %s WHERE id=%s",
                    (int(delta), record_id)
                )
            if set_orders is not None:
                cur.execute(
                    f"UPDATE {SCHEMA}.records SET successful_orders = %s WHERE id=%s",
                    (int(set_orders), record_id)
                )
            conn.commit()
            cur.execute(f"SELECT id, name, successful_orders FROM {SCHEMA}.records WHERE id=%s", (record_id,))
            row = cur.fetchone()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": row[0], "name": row[1], "successful_orders": row[2]})}

        if method == "DELETE":
            record_id = params.get("id")
            if not record_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id обязателен"})}
            cur.execute(f"DELETE FROM {SCHEMA}.records WHERE id=%s", (record_id,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"deleted": True})}

        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}

    finally:
        cur.close()
        conn.close()
