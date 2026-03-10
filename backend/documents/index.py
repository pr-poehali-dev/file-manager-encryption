import json
import os
import base64
import psycopg2
import boto3

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p95298898_file_manager_encrypt")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

ENCRYPT_CHARS = "∅∑€∂∇◊Ω∞ƶ!@#%∆Ψ"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )

def encrypt_name(name: str) -> str:
    result = []
    for i, ch in enumerate(name):
        if ch in ".-_":
            result.append(ch)
        elif i % 3 == 0:
            result.append(ENCRYPT_CHARS[ord(ch) % len(ENCRYPT_CHARS)])
        else:
            result.append(ch)
    return result[0] if len(result) == 1 else "".join(result[:3]) + "∅" + "".join(result[3:])

def handler(event: dict, context) -> dict:
    """Управление документами: список, загрузка файла, удаление, получение содержимого."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET":
            action = params.get("action", "list")

            if action == "content":
                doc_id = params.get("id")
                if not doc_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id обязателен"})}
                cur.execute(f"SELECT s3_key, file_type FROM {SCHEMA}.documents WHERE id = %s", (int(doc_id),))
                row = cur.fetchone()
                if not row:
                    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Документ не найден"})}
                s3_key, file_type = row
                s3 = get_s3()
                obj = s3.get_object(Bucket="files", Key=s3_key)
                content = obj["Body"].read()
                if file_type == "txt":
                    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"content": content.decode("utf-8"), "type": "txt"}, ensure_ascii=False)}
                else:
                    b64 = base64.b64encode(content).decode()
                    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"content": b64, "type": file_type}, ensure_ascii=False)}

            # list
            folder_id = params.get("folder_id")
            if folder_id:
                cur.execute(f"SELECT id, folder_id, name, encrypted_name, file_type, created_at FROM {SCHEMA}.documents WHERE folder_id = %s ORDER BY id", (folder_id,))
            else:
                cur.execute(f"SELECT id, folder_id, name, encrypted_name, file_type, created_at FROM {SCHEMA}.documents ORDER BY id")
            rows = cur.fetchall()
            docs = [{"id": r[0], "folder_id": r[1], "name": r[2], "encrypted_name": r[3], "file_type": r[4], "created_at": str(r[5])} for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"documents": docs}, ensure_ascii=False)}

        elif method == "POST":
            body = json.loads(event.get("body") or "{}")
            folder_id = body.get("folder_id", "").strip()
            name = body.get("name", "").strip()
            file_type = body.get("file_type", "txt").strip().lower()
            file_data_b64 = body.get("file_data", "")

            if not folder_id or not name or not file_data_b64:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "folder_id, name, file_data обязательны"})}

            file_bytes = base64.b64decode(file_data_b64)
            s3_key = f"documents/{folder_id}/{name}"
            content_type = "image/png" if file_type == "png" else "text/plain; charset=utf-8"
            s3 = get_s3()
            s3.put_object(Bucket="files", Key=s3_key, Body=file_bytes, ContentType=content_type)

            encrypted_name = encrypt_name(name)
            cur.execute(
                f"INSERT INTO {SCHEMA}.documents (folder_id, name, encrypted_name, file_type, s3_key) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (folder_id, name, encrypted_name, file_type, s3_key)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return {"statusCode": 201, "headers": CORS, "body": json.dumps({"id": new_id, "name": name, "encrypted_name": encrypted_name}, ensure_ascii=False)}

        elif method == "DELETE":
            doc_id = params.get("id")
            if not doc_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id обязателен"})}
            cur.execute(f"SELECT s3_key FROM {SCHEMA}.documents WHERE id = %s", (int(doc_id),))
            row = cur.fetchone()
            if row:
                try:
                    s3 = get_s3()
                    s3.delete_object(Bucket="files", Key=row[0])
                except Exception:
                    pass
            cur.execute(f"DELETE FROM {SCHEMA}.documents WHERE id = %s", (int(doc_id),))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}
    finally:
        cur.close()
        conn.close()
