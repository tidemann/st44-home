FROM postgres:17-alpine

# Copy initialization script
COPY init.sql /docker-entrypoint-initdb.d/

# Copy migration runner script and migrations
COPY run-migrations.sh /usr/local/bin/
COPY migrations /migrations/

# Make migration script executable
RUN chmod +x /usr/local/bin/run-migrations.sh

# The postgres image will automatically run any .sql files
# in /docker-entrypoint-initdb.d/ on first startup
