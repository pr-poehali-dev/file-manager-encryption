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

def make_cdn_url(s3_key: str) -> str:
    key_id = os.environ["AWS_ACCESS_KEY_ID"]
    return f"https://cdn.poehali.dev/projects/{key_id}/bucket/{s3_key}"

def encrypt_name(name: str) -> str:
    result = []
    for i, ch in enumerate(name):
        if ch in ".-_":
            result.append(ch)
        elif i % 3 == 0:
            result.append(ENCRYPT_CHARS[ord(ch) % len(ENCRYPT_CHARS)])
        else:
            result.append(ch)
    return "".join(result[:3]) + "∅" + "".join(result[3:]) if len(result) > 3 else "".join(result)

def handler(event: dict, context) -> dict:
    """Управление документами: список, загрузка (PNG/JPG с фейк-заглушкой), удаление, получение содержимого."""
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
                cur.execute(
                    f"SELECT s3_key, file_type, fake_s3_key, cdn_url, fake_cdn_url FROM {SCHEMA}.documents WHERE id = %s",
                    (int(doc_id),)
                )
                row = cur.fetchone()
                if not row:
                    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Документ не найден"})}
                s3_key, file_type, fake_s3_key, real_cdn, fake_cdn = row

                is_image = file_type in ("png", "jpg", "jpeg")

                if is_image:
                    # cdn_url = расшифрованный (.jpg), fake_cdn_url = зашифрованный (.png)
                    return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                        "type": file_type,
                        "cdn_url": real_cdn or make_cdn_url(s3_key),
                        "fake_cdn_url": fake_cdn or (make_cdn_url(fake_s3_key) if fake_s3_key else None),
                    }, ensure_ascii=False)}

                # txt — read from S3
                s3 = get_s3()
                obj = s3.get_object(Bucket="files", Key=s3_key)
                content = obj["Body"].read()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"content": content.decode("utf-8"), "type": "txt"}, ensure_ascii=False)}

            # list
            folder_id = params.get("folder_id")
            if folder_id:
                cur.execute(
                    f"SELECT id, folder_id, name, encrypted_name, file_type, created_at, cdn_url, fake_cdn_url FROM {SCHEMA}.documents WHERE folder_id = %s ORDER BY id",
                    (folder_id,)
                )
            else:
                cur.execute(
                    f"SELECT id, folder_id, name, encrypted_name, file_type, created_at, cdn_url, fake_cdn_url FROM {SCHEMA}.documents ORDER BY id"
                )
            rows = cur.fetchall()
            docs = [{
                "id": r[0], "folder_id": r[1], "name": r[2], "encrypted_name": r[3],
                "file_type": r[4], "created_at": str(r[5]),
                "cdn_url": r[6], "fake_cdn_url": r[7],
            } for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"documents": docs}, ensure_ascii=False)}

        elif method == "POST":
            body = json.loads(event.get("body") or "{}")
            folder_id = body.get("folder_id", "").strip()
            name = body.get("name", "").strip()
            file_type = body.get("file_type", "txt").strip().lower()
            file_data_b64 = body.get("file_data", "")
            fake_data_b64 = body.get("fake_file_data", "")  # optional fake image for encrypted view

            if not folder_id or not name or not file_data_b64:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "folder_id, name, file_data обязательны"})}

            file_bytes = base64.b64decode(file_data_b64)
            is_image = file_type in ("png", "jpg", "jpeg")
            content_type_map = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "txt": "text/plain; charset=utf-8"}
            content_type = content_type_map.get(file_type, "application/octet-stream")

            s3 = get_s3()
            s3_key = f"documents/{folder_id}/{name}"
            s3.put_object(Bucket="files", Key=s3_key, Body=file_bytes, ContentType=content_type)
            real_cdn = make_cdn_url(s3_key)

            # Upload fake image (shown when encrypted) — same name but .jpg
            # Real image (shown after decryption) is .png
            fake_s3_key = None
            fake_cdn = None
            if is_image and fake_data_b64:
                base_name = name.rsplit(".", 1)[0]
                fake_s3_key = f"documents/{folder_id}/{base_name}.jpg"
                fake_bytes = base64.b64decode(fake_data_b64)
                s3.put_object(Bucket="files", Key=fake_s3_key, Body=fake_bytes, ContentType="image/jpeg")
                fake_cdn = make_cdn_url(fake_s3_key)

            encrypted_name = encrypt_name(name)
            cur.execute(
                f"INSERT INTO {SCHEMA}.documents (folder_id, name, encrypted_name, file_type, s3_key, fake_s3_key, cdn_url, fake_cdn_url) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (folder_id, name, encrypted_name, file_type, s3_key, fake_s3_key, real_cdn, fake_cdn)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return {"statusCode": 201, "headers": CORS, "body": json.dumps({
                "id": new_id, "name": name, "encrypted_name": encrypted_name,
                "cdn_url": real_cdn, "fake_cdn_url": fake_cdn,
            }, ensure_ascii=False)}

        elif method == "DELETE":
            doc_id = params.get("id")
            if not doc_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id обязателен"})}
            cur.execute(f"SELECT s3_key, fake_s3_key FROM {SCHEMA}.documents WHERE id = %s", (int(doc_id),))
            row = cur.fetchone()
            if row:
                s3 = get_s3()
                for key in [row[0], row[1]]:
                    if key:
                        try:
                            s3.delete_object(Bucket="files", Key=key)
                        except Exception:
                            pass
            cur.execute(f"DELETE FROM {SCHEMA}.documents WHERE id = %s", (int(doc_id),))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}
    finally:
        cur.close()
        conn.close()