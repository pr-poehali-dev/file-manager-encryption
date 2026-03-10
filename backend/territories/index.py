"""
Управление таблицей территорий: добавление, редактирование, изменение уровня контроля.
"""
import json
import os
import psycopg2

SCHEMA = "t_p95298898_file_manager_encrypt"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

VALID_OWNERS = ["Каморра", "Русска Рома", "Триады", "Бездомные", "Пусто"]

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """Таблица территорий: CRUD + изменение уровня контроля."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET":
            cur.execute(
                f"SELECT id, territory_number, territory_name, owner, control_level, created_at "
                f"FROM {SCHEMA}.territories ORDER BY territory_number ASC"
            )
            rows = cur.fetchall()
            territories = [
                {
                    "id": r[0],
                    "territory_number": r[1],
                    "territory_name": r[2],
                    "owner": r[3],
                    "control_level": r[4],
                    "created_at": str(r[5]),
                }
                for r in rows
            ]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"territories": territories})}

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            territory_number = body.get("territory_number")
            territory_name = (body.get("territory_name") or "").strip()
            owner = body.get("owner", "Пусто")
            control_level = int(body.get("control_level", 0))

            if territory_number is None or not territory_name:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Номер и название обязательны"})}
            if owner not in VALID_OWNERS:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Недопустимый владелец"})}
            control_level = max(0, min(5, control_level))

            cur.execute(
                f"INSERT INTO {SCHEMA}.territories (territory_number, territory_name, owner, control_level) "
                f"VALUES (%s, %s, %s, %s) RETURNING id, territory_number, territory_name, owner, control_level",
                (territory_number, territory_name, owner, control_level)
            )
            row = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "id": row[0], "territory_number": row[1], "territory_name": row[2],
                "owner": row[3], "control_level": row[4]
            })}

        if method == "PUT":
            body = json.loads(event.get("body") or "{}")
            territory_id = body.get("id")
            if not territory_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id обязателен"})}

            updates = []
            values = []

            if "territory_name" in body:
                updates.append("territory_name=%s")
                values.append(body["territory_name"].strip())
            if "owner" in body:
                if body["owner"] not in VALID_OWNERS:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Недопустимый владелец"})}
                updates.append("owner=%s")
                values.append(body["owner"])
            if "control_level" in body:
                lvl = max(0, min(5, int(body["control_level"])))
                updates.append("control_level=%s")
                values.append(lvl)
            if "control_delta" in body:
                cur.execute(
                    f"UPDATE {SCHEMA}.territories SET control_level = GREATEST(0, LEAST(5, control_level + %s)) WHERE id=%s",
                    (int(body["control_delta"]), territory_id)
                )
                conn.commit()
                cur.execute(
                    f"SELECT id, territory_number, territory_name, owner, control_level FROM {SCHEMA}.territories WHERE id=%s",
                    (territory_id,)
                )
                row = cur.fetchone()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                    "id": row[0], "territory_number": row[1], "territory_name": row[2],
                    "owner": row[3], "control_level": row[4]
                })}

            if updates:
                values.append(territory_id)
                cur.execute(
                    f"UPDATE {SCHEMA}.territories SET {', '.join(updates)} WHERE id=%s",
                    values
                )
                conn.commit()

            cur.execute(
                f"SELECT id, territory_number, territory_name, owner, control_level FROM {SCHEMA}.territories WHERE id=%s",
                (territory_id,)
            )
            row = cur.fetchone()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "id": row[0], "territory_number": row[1], "territory_name": row[2],
                "owner": row[3], "control_level": row[4]
            })}

        if method == "DELETE":
            territory_id = params.get("id")
            if not territory_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id обязателен"})}
            cur.execute(f"DELETE FROM {SCHEMA}.territories WHERE id=%s", (territory_id,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"deleted": True})}

        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}

    finally:
        cur.close()
        conn.close()
