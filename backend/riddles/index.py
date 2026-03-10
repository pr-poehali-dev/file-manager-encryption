import json
import os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p95298898_file_manager_encrypt")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """Управление загадками: получить все, добавить, удалить."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET":
            cur.execute(f"SELECT id, question, answer, created_at FROM {SCHEMA}.riddles ORDER BY id")
            rows = cur.fetchall()
            riddles = [{"id": r[0], "question": r[1], "answer": r[2], "created_at": str(r[3])} for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"riddles": riddles}, ensure_ascii=False)}

        elif method == "POST":
            body = json.loads(event.get("body") or "{}")
            question = body.get("question", "").strip()
            answer = body.get("answer", "").strip()
            if not question or not answer:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "question и answer обязательны"})}
            cur.execute(
                f"INSERT INTO {SCHEMA}.riddles (question, answer) VALUES (%s, %s) RETURNING id",
                (question, answer)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return {"statusCode": 201, "headers": CORS, "body": json.dumps({"id": new_id, "question": question, "answer": answer}, ensure_ascii=False)}

        elif method == "DELETE":
            params = event.get("queryStringParameters") or {}
            riddle_id = params.get("id")
            if not riddle_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id обязателен"})}
            cur.execute(f"DELETE FROM {SCHEMA}.riddles WHERE id = %s", (int(riddle_id),))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}
    finally:
        cur.close()
        conn.close()
