#!/bin/bash

# ========================================
# Комплексная проверка защиты проекта
# ========================================
# Проверяет все системы защиты:
#   - Git репозиторий
#   - CI/CD pipeline
#   - Docker images
#   - Бэкапы БД
#   - Health checks
# ========================================

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Счётчики
CHECKS_TOTAL=0
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

log_error() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    ((CHECKS_FAILED++))
}

log_success() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    ((CHECKS_PASSED++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARN: $1${NC}"
    ((CHECKS_WARNING++))
}

log_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

log_section() {
    echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
}

check() {
    ((CHECKS_TOTAL++))
}

# Определить где мы запущены (локально или на VPS)
if [ -f "/opt/fin-u-ch/docker-compose.prod.yml" ]; then
    LOCATION="vps"
    PROJECT_DIR="/opt/fin-u-ch"
else
    LOCATION="local"
    PROJECT_DIR="$(pwd)"
fi

echo "═══════════════════════════════════════"
echo "  🛡️  Protection System Check"
echo "═══════════════════════════════════════"
log_info "Location: $LOCATION"
log_info "Project: $PROJECT_DIR"
echo ""

# ============================================
# 1. Git Repository
# ============================================
log_section "1. Git Repository"

cd "$PROJECT_DIR" || exit 1

# 1.1 Check Git is initialized
check
if [ -d ".git" ]; then
    log_success "Git repository initialized"
else
    log_error "Git repository not found"
fi

# 1.2 Check remote
check
REMOTE=$(git remote -v 2>/dev/null | grep origin | head -1)
if [ -n "$REMOTE" ]; then
    log_success "Remote configured: $(echo $REMOTE | awk '{print $2}')"
else
    log_error "No Git remote configured"
fi

# 1.3 Check for uncommitted changes
check
if git diff-index --quiet HEAD -- 2>/dev/null; then
    log_success "Working tree is clean"
else
    log_warning "Uncommitted changes exist"
fi

# 1.4 Check last commit
check
LAST_COMMIT=$(git log -1 --format="%h %s" 2>/dev/null)
if [ -n "$LAST_COMMIT" ]; then
    log_success "Last commit: $LAST_COMMIT"
else
    log_error "No commits found"
fi

# ============================================
# 2. GitHub Settings (только для local)
# ============================================
if [ "$LOCATION" = "local" ]; then
    log_section "2. GitHub Settings"
    
    log_info "Branch protection должен быть настроен вручную на GitHub"
    log_info "См. docs/GITHUB_PROTECTION_CHECKLIST.md"
    echo ""
    log_info "Проверьте на GitHub:"
    echo "  1. https://github.com/thoxly/fin-u-ch/settings/branches"
    echo "  2. Branch protection rule для 'main' должен быть активен"
    echo "  3. Require pull request: ON"
    echo "  4. Require status checks: ON"
fi

# ============================================
# 3. CI/CD Pipeline (только для local)
# ============================================
if [ "$LOCATION" = "local" ]; then
    log_section "3. CI/CD Pipeline"
    
    check
    if [ -f ".github/workflows/ci-cd.yml" ]; then
        log_success "CI/CD workflow file exists"
    else
        log_error "CI/CD workflow file not found"
    fi
    
    log_info "Последние CI/CD runs:"
    log_info "https://github.com/thoxly/fin-u-ch/actions"
fi

# ============================================
# 4. Docker Images (только для VPS)
# ============================================
if [ "$LOCATION" = "vps" ]; then
    log_section "4. Docker Images"
    
    check
    if docker images | grep -q "fin-u-ch-api"; then
        VERSION=$(docker images --format "{{.Tag}}" ghcr.io/thoxly/fin-u-ch-api | head -1)
        log_success "API image: $VERSION"
    else
        log_error "API image not found"
    fi
    
    check
    if docker images | grep -q "fin-u-ch-web"; then
        VERSION=$(docker images --format "{{.Tag}}" ghcr.io/thoxly/fin-u-ch-web | head -1)
        log_success "Web image: $VERSION"
    else
        log_error "Web image not found"
    fi
    
    check
    if docker images | grep -q "fin-u-ch-worker"; then
        VERSION=$(docker images --format "{{.Tag}}" ghcr.io/thoxly/fin-u-ch-worker | head -1)
        log_success "Worker image: $VERSION"
    else
        log_error "Worker image not found"
    fi
fi

# ============================================
# 5. Database Backups (только для VPS)
# ============================================
if [ "$LOCATION" = "vps" ]; then
    log_section "5. Database Backups"
    
    BACKUP_DIR="/opt/fin-u-ch/backups"
    
    check
    if [ -d "$BACKUP_DIR" ]; then
        log_success "Backup directory exists"
    else
        log_error "Backup directory not found: $BACKUP_DIR"
    fi
    
    check
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup-*.sql.gz 2>/dev/null | wc -l)
    if [ $BACKUP_COUNT -gt 0 ]; then
        log_success "Found $BACKUP_COUNT backup file(s)"
    else
        log_error "No backup files found"
    fi
    
    check
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup-*.sql.gz 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        AGE_SECONDS=$(( $(date +%s) - $(stat -c %Y "$LATEST_BACKUP" 2>/dev/null || stat -f %m "$LATEST_BACKUP") ))
        AGE_HOURS=$(( $AGE_SECONDS / 3600 ))
        
        if [ $AGE_HOURS -lt 30 ]; then
            log_success "Latest backup: ${AGE_HOURS}h old"
        else
            log_error "Latest backup is too old: ${AGE_HOURS}h"
        fi
    else
        log_error "Could not determine latest backup"
    fi
    
    check
    if crontab -l 2>/dev/null | grep -q "backup-db.sh"; then
        log_success "Backup cron job configured"
    else
        log_warning "Backup cron job not found"
        log_info "Run: sudo /opt/fin-u-ch/scripts/setup-backups.sh"
    fi
fi

# ============================================
# 6. Running Services (только для VPS)
# ============================================
if [ "$LOCATION" = "vps" ]; then
    log_section "6. Running Services"
    
    cd "$PROJECT_DIR" || exit 1
    
    check
    if docker compose ps postgres | grep -q "Up"; then
        log_success "PostgreSQL is running"
    else
        log_error "PostgreSQL is not running"
    fi
    
    check
    if docker compose ps redis | grep -q "Up"; then
        log_success "Redis is running"
    else
        log_error "Redis is not running"
    fi
    
    check
    if docker compose ps api | grep -q "Up"; then
        log_success "API is running"
    else
        log_error "API is not running"
    fi
    
    check
    if docker compose ps web | grep -q "Up"; then
        log_success "Web is running"
    else
        log_error "Web is not running"
    fi
    
    check
    if docker compose ps worker | grep -q "Up"; then
        log_success "Worker is running"
    else
        log_error "Worker is not running"
    fi
    
    # Health check
    check
    if curl -f http://localhost/api/health &> /dev/null; then
        log_success "API health check passed"
    else
        log_error "API health check failed"
    fi
fi

# ============================================
# 7. Scripts (оба режима)
# ============================================
log_section "7. Protection Scripts"

check
if [ -x "$PROJECT_DIR/scripts/backup-db.sh" ]; then
    log_success "backup-db.sh is executable"
else
    log_error "backup-db.sh not found or not executable"
fi

check
if [ -x "$PROJECT_DIR/scripts/restore-db.sh" ]; then
    log_success "restore-db.sh is executable"
else
    log_error "restore-db.sh not found or not executable"
fi

check
if [ -x "$PROJECT_DIR/scripts/check-backups.sh" ]; then
    log_success "check-backups.sh is executable"
else
    log_error "check-backups.sh not found or not executable"
fi

# ============================================
# 8. Documentation (только для local)
# ============================================
if [ "$LOCATION" = "local" ]; then
    log_section "8. Documentation"
    
    check
    if [ -f "docs/PROTECTION_SUMMARY.md" ]; then
        log_success "Protection Summary exists"
    else
        log_error "Protection Summary not found"
    fi
    
    check
    if [ -f "docs/BACKUP_STRATEGY.md" ]; then
        log_success "Backup Strategy exists"
    else
        log_error "Backup Strategy not found"
    fi
    
    check
    if [ -f "docs/GITHUB_PROTECTION_CHECKLIST.md" ]; then
        log_success "GitHub Protection Checklist exists"
    else
        log_error "GitHub Protection Checklist not found"
    fi
fi

# ============================================
# Summary
# ============================================
log_section "Summary"

echo ""
echo "Total checks:   $CHECKS_TOTAL"
echo -e "${GREEN}Passed:         $CHECKS_PASSED${NC}"
echo -e "${YELLOW}Warnings:       $CHECKS_WARNING${NC}"
echo -e "${RED}Failed:         $CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    if [ $CHECKS_WARNING -eq 0 ]; then
        echo -e "${GREEN}═══════════════════════════════════════${NC}"
        echo -e "${GREEN}✅ All protection systems are OK!${NC}"
        echo -e "${GREEN}═══════════════════════════════════════${NC}"
        exit 0
    else
        echo -e "${YELLOW}═══════════════════════════════════════${NC}"
        echo -e "${YELLOW}⚠️  Some warnings detected${NC}"
        echo -e "${YELLOW}═══════════════════════════════════════${NC}"
        exit 0
    fi
else
    echo -e "${RED}═══════════════════════════════════════${NC}"
    echo -e "${RED}❌ Protection system has issues!${NC}"
    echo -e "${RED}═══════════════════════════════════════${NC}"
    echo ""
    log_info "See docs/PROTECTION_SUMMARY.md for help"
    exit 1
fi

