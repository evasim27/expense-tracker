# Navodila za nastavitev GitHub Pages in Environments

## 📋 Pregled implementacije

Ustvaril sem vse potrebne datoteke za izpolnitev zahtev vaje:

### ✅ Ustvarjene datoteke:
1. **docs/index.html** - Statična stran za GitHub Pages
2. **Dockerfile** - Za izgradnjo Docker slik
3. **.dockerignore** - Optimizacija Docker build procesa
4. **.github/workflows/deploy.yml** - CI/CD pipeline

---

## 🚀 Koraki za dokončanje naloge

### 1. Nastavitev GitHub Repository

#### a) Omogoči GitHub Pages
1. Pojdi na svoj GitHub repository
2. Klikni **Settings** > **Pages**
3. Pod **Build and deployment**:
   - Source: `GitHub Actions`
4. Shrani nastavitve

#### b) Ustvari GitHub Environments

**Development Environment:**
1. Pojdi na **Settings** > **Environments**
2. Klikni **New environment**
3. Ime: `Development`
4. Klikni **Configure environment**
5. Ne nastavi deployment protection rules (za avtomatsko deployment)

**Production Environment:**
1. Klikni **New environment**
2. Ime: `Production`
3. Klikni **Configure environment**
4. Omogoči **Required reviewers**:
   - Dodaj sebe ali člana ekipe kot revisorja
   - To bo zahtevalo ročno odobritev pred deploymentom

### 2. Nastavitev Docker Hub Secrets

1. Registriraj se na [Docker Hub](https://hub.docker.com/) (če še nisi)
2. V GitHub repository pojdi na **Settings** > **Secrets and variables** > **Actions**
3. Dodaj naslednje secrets:
   - **DOCKER_USERNAME**: Tvoje Docker Hub uporabniško ime
   - **DOCKER_PASSWORD**: Tvoje Docker Hub geslo ali Access Token

**Priporočilo:** Uporabi Docker Hub Access Token namesto gesla:
- Docker Hub > Account Settings > Security > New Access Token

### 3. Ustvari `production` branch

Za production deployment potrebuješ branch `production`:

```bash
git checkout -b production
git push origin production
```

### 4. Push sprememb na GitHub

```bash
git add .
git commit -m "feat: Add GitHub Pages and CI/CD pipeline with environments"
git push origin main
```

---

## 📊 Kako deluje CI/CD Pipeline

### Workflow Struktura:

```
┌─────────────────────────────────────────────────┐
│  Push na main ali production branch             │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
┌──────────────┐    ┌─────────────────┐
│ GitHub Pages │    │ Build and Test  │
│   Deployment │    │                 │
└──────────────┘    └────────┬────────┘
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
         ┌─────────────────┐   ┌─────────────────┐
         │  Development    │   │   Production    │
         │  (main branch)  │   │ (prod branch)   │
         │  Tag: dev       │   │  Tag: prod      │
         │  Avtomatsko     │   │  Ročna odobritev│
         └─────────────────┘   └─────────────────┘
```

### Faze Workflow-a:

1. **deploy-github-pages**
   - Objavi `docs/index.html` na GitHub Pages
   - Teče na: `main` ali `production` branch

2. **build-and-test**
   - Instalira odvisnosti
   - Zgradi Docker sliko
   - Izvede teste (če obstajajo)

3. **deploy-development**
   - Teče: Samo na `main` branch
   - Oznaka: `dev`
   - Docker Hub: Objavi kot `expense-tracker:dev`
   - Avtomatsko (brez odobritve)

4. **deploy-production**
   - Teče: Samo na `production` branch
   - Oznaka: `prod` in `latest`
   - Docker Hub: Objavi kot `expense-tracker:prod` in `expense-tracker:latest`
   - Zahteva ročno odobritev

---

## 🧪 Testiranje

### Test 1: GitHub Pages
1. Push na `main` branch
2. Počakaj ~2 minuti
3. Obišči: `https://<tvoj-username>.github.io/<ime-repozitorija>/`

### Test 2: Development Environment
1. Push na `main` branch
2. Preveri Actions tab
3. Preveri Docker Hub: `docker pull <username>/expense-tracker:dev`

### Test 3: Production Environment
1. Push na `production` branch
2. V Actions tab klikni na workflow run
3. Potrdi deployment (ročna odobritev)
4. Preveri Docker Hub: `docker pull <username>/expense-tracker:prod`

---

## 🎯 Kontrolni seznam (Checklist)

- [ ] GitHub Pages omogočen (Settings > Pages > Source: GitHub Actions)
- [ ] Development environment ustvarjen (brez protection rules)
- [ ] Production environment ustvarjen (z required reviewers)
- [ ] DOCKER_USERNAME secret dodan
- [ ] DOCKER_PASSWORD secret dodan
- [ ] `production` branch ustvarjen
- [ ] Vse datoteke pushane na GitHub
- [ ] GitHub Pages stran deluje
- [ ] Docker slika z oznako `dev` na Docker Hub
- [ ] Docker slika z oznako `prod` na Docker Hub (po ročni odobritvi)

---

## 📝 Prilagoditve

### Posodobi docs/index.html:
- Dodaj **vsa imena članov ekipe** v sekcijo "Člani ekipe"
- Posodobi GitHub link na dnu strani z dejanskim repository URL-jem

### Če imaš drugačno strukturo projekta:
- Prilagodi `Dockerfile` za kopiranje pravilnih datotek
- Posodobi `.dockerignore` po potrebi

---

## 🔍 Pogosta vprašanja

**Q: Workflow ne teče?**
A: Preveri:
- Ali si pushil na `main` ali `production` branch
- Ali imaš pravilne permissions v workflow datoteki
- Ali so secrets pravilno nastavljeni

**Q: GitHub Pages ne prikazuje strani?**
A: Preveri:
- Settings > Pages > Source mora biti "GitHub Actions"
- Počakaj nekaj minut po deployment
- Preveri Actions tab za napake

**Q: Docker push ne uspe?**
A: Preveri:
- Ali sta DOCKER_USERNAME in DOCKER_PASSWORD pravilno nastavljena
- Ali obstaja repository na Docker Hub (lahko je privaten ali public)

**Q: Production deployment se ne sproži?**
A: Preveri:
- Ali si pushil na `production` branch (ne `main`)
- Ali potrebuješ potrditi deployment v Actions tab

---

## 📚 Viri

- [GitHub Pages Dokumentacija](https://docs.github.com/en/pages)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Docker Hub](https://hub.docker.com/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Uspešno delo! 🎉**
