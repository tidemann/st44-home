FROM postgres:17-alpine

# Copy initialization script
COPY init.sql /docker-entrypoint-initdb.d/

# The postgres image will automatically run any .sql files
# in /docker-entrypoint-initdb.d/ on first startup
