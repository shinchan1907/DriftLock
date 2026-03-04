import sqlite3
import os

db_path = "/app/data/driftlock.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"Migrating database at {db_path}...")
    
    # Add columns to cloudflare_config
    try:
        cursor.execute("ALTER TABLE cloudflare_config ADD COLUMN account_id TEXT")
        print("Added account_id to cloudflare_config")
    except sqlite3.OperationalError as e:
        print(f"cloudflare_config: {e}")
        
    # Add columns to services
    columns = [
        ("tunnel_mode", "BOOLEAN DEFAULT 0"),
        ("tunnel_id", "TEXT"),
        ("tunnel_token", "TEXT"),
        ("tunnel_account_id", "TEXT"),
        ("local_service_url", "TEXT")
    ]
    
    for col_name, col_type in columns:
        try:
            cursor.execute(f"ALTER TABLE services ADD COLUMN {col_name} {col_type}")
            print(f"Added {col_name} to services")
        except sqlite3.OperationalError as e:
            print(f"services ({col_name}): {e}")
            
    conn.commit()
    conn.close()
    print("Migration complete.")
else:
    print(f"Database not found at {db_path}")
