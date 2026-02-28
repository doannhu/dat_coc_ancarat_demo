#!/bin/bash

# Ensure a backup file is provided
if [ -z "$1" ]; then
  echo "Usage: ./restore_db.sh <db_backup_28022026_1837.sql>"
  exit 1
fi

INPUT_FILE="$1"

if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: File '$INPUT_FILE' not found!"
    exit 1
fi

UTF8_TEMP="temp_utf8_conversion.sql"
FIXED_FILE="fixed_backup.sql"

# Detect encoding
echo "Detecting file encoding..."
ENCODING=$(file -b --mime-encoding "$INPUT_FILE")
echo "Encoding format: $ENCODING"

# Convert to UTF-8 if it is UTF-16LE
if [ "$ENCODING" = "utf-16le" ]; then
    echo "Converting from UTF-16LE to UTF-8..."
    iconv -f UTF-16LE -t UTF-8 "$INPUT_FILE" > "$UTF8_TEMP"
else
    echo "Assuming file is already UTF-8 compatible..."
    cp "$INPUT_FILE" "$UTF8_TEMP"
fi

# Fix Vietnamese Mojibake from CP437
echo "Fixing character encoding (Mojibake)..."
python3 -c "
import sys
try:
    with open('$UTF8_TEMP', 'r', encoding='utf-8') as f:
        text = f.read()
    with open('$FIXED_FILE', 'wb') as f:
        # Converts mismatched dos CP437 bytes back into proper UTF-8 data
        f.write(text.encode('cp437', errors='replace'))
except Exception as e:
    print('Encoding fix error:', e)
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    echo "Failed to fix character encoding. Aborting..."
    rm -f "$UTF8_TEMP" "$FIXED_FILE"
    exit 1
fi

# Clear current database content
echo "Clearing existing database tables..."
docker exec -i database_db psql -U user -d dbname -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Pipe the fixed script into docker restore
echo "Restoring database..."
cat "$FIXED_FILE" | docker exec -i database_db psql -U user -d dbname

# Cleanup remaining temp files
rm -f "$UTF8_TEMP" "$FIXED_FILE"

echo "✅ Database restore completed successfully!"
