BINARY=bin/server
CMD=./cmd/server

.PHONY: run build migrate tidy

## run: start the dev server (loads .env automatically)
run:
	go run $(CMD)

## build: compile to bin/server
build:
	go build -o $(BINARY) $(CMD)

## migrate: apply the SQL migration to the database
migrate:
	psql "$$DATABASE_URL" -f migrations/001_initial.sql

## tidy: download and tidy dependencies
tidy:
	go mod tidy

## test: run all tests
test:
	go test ./...