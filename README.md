# Expense Tracker - Varnostna Analiza in Izboljšave

## 📋 Pregled

Analiza varnostnega stanja aplikacije in odpravljanje ranljivosti z uporabo GitHub Code Scanning in Snyk.

---

## 🔍 Ugotovljeno Začetno Stanje

### Identificirane Ranljivosti:

#### 1. **GitHub CodeQL Security Scan**

**Najdenih 10 High Severity Issues:**
- ❌ **Missing Rate Limiting** (10x)
  - Lokacija: `server.js` (vsi API endpoints)
  - Tveganje: DDoS napadi, brute-force, API abuse
  - Opis: Brez omejitev števila zahtevkov na endpoint

**Dodatne Ugotovitve:**
- ❌ **Hardcoded Database Password**
  - Lokacija: `.env:1`
  - Tveganje: Credential exposure v Git historiji
  - Opis: PostgreSQL credentials hardcoded v kodi

#### 2. **Snyk**

V Dockerfile ni bilo potrebno spremeniti nič.

### 3. Hardcoded Credentials (GitHub CodeQL - Critical)

**Problem:**
Database credentials v `.env` datoteki commitani v Git

## 🔒 Implementiran Security Workflow

```yaml
GitHub Actions Pipeline:
├─ CodeQL Security Scan
│  └─ Analiza JavaScript kode
│     └─ Detekcija varnostnih ranljivosti
│
├─ Snyk Docker Scan
│  └─ Scan Docker image
│     └─ Check dependencies
│        └─ Upload results to GitHub Security
│
└─ SonarCloud Quality Gate
   └─ Code quality check
      └─ Blokira production če faila
```

**Frequency:** Vsak push na `main` in `production` branch