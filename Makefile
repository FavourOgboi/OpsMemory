.PHONY: setup start dev dev-tunnel db-up db-down migrate

setup:
	npm run setup

start:
	npm start

dev:
	npm run dev

dev-tunnel:
	npm run dev:tunnel

db-up:
	docker compose -f docker-compose.dev.yml up -d postgres

db-down:
	docker compose -f docker-compose.dev.yml down

migrate:
	npm run db:migrate
