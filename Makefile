.PHONY: help build up down logs clean install-dev

help: ## Show this help message
	@echo "NagaraTrack Lite - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build all services
	docker compose build

up: ## Start all services
	docker compose up -d

up-logs: ## Start all services with logs
	docker compose up

down: ## Stop all services
	docker compose down

logs: ## Show logs for all services
	docker compose logs -f

logs-backend: ## Show backend service logs
	docker compose logs -f backend

logs-frontend: ## Show frontend service logs
	docker compose logs -f frontend

logs-bot: ## Show bot service logs
	docker compose logs -f bot

clean: ## Clean up containers, images and volumes
	docker compose down -v
	docker compose rm -f
	docker system prune -f

install-dev: ## Install development dependencies locally
	cd backend && pip install -r requirements.txt
	cd frontend-pwa && npm install

reset-db: ## Reset database (WARNING: destroys all data)
	docker compose down postgres
	docker volume rm sih-project_postgres_data || true
	docker compose up -d postgres

status: ## Show service status
	docker compose ps

shell-backend: ## Get shell access to backend container
	docker compose exec backend /bin/bash

shell-frontend: ## Get shell access to frontend container
	docker compose exec frontend /bin/sh