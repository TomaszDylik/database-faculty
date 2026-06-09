# Projekt: Mikroserwisy z API Gateway, Keycloak i React (OAuth2 + PKCE)
**Autor:** Tomasz Dylik

## Architektura systemu
Projekt to nowoczesna aplikacja oparta na architekturze mikroserwisów uruchamianych w środowisku Docker.
1. **Frontend (React + Vite):** Aplikacja SPA działająca na porcie `5173`.
2. **Reverse Proxy (Nginx):** Działa na porcie `80`, kierując ruch z przeglądarki do Gatewaya i omijając problemy z CORS.
3. **API Gateway (Node.js/Express):** Serce backendu. Weryfikuje tokeny JWT i przekierowuje zapytania do konkretnych mikroserwisów.
4. **Mikroserwisy (Node.js):** Serwisy z bazami PostgreSQL oraz MongoDB, schowane w sieci wewnętrznej Dockera.
5. **Keycloak:** Serwer tożsamości (Identity and Access Management) dostarczający uwierzytelnianie w standardzie OAuth 2.0.

## Mechanizm PKCE (Proof Key for Code Exchange)
Aplikacja frontendowa (SPA) jest klientem publicznym, co oznacza, że nie może bezpiecznie przechowywać tajnego klucza (Client Secret). Zamiast tego logowanie realizowane jest z użyciem mechanizmu PKCE:
1. React generuje losowy ciąg znaków (`Code Verifier`) i oblicza jego hash (`Code Challenge`).
2. Wysyła `Code Challenge` do Keycloaka podczas prośby o logowanie.
3. Po pomyślnym zalogowaniu, React otrzymuje jednorazowy kod autoryzacyjny.
4. React wymienia ten kod na Token JWT, wysyłając oryginalny `Code Verifier`. Keycloak haszuje go i sprawdza, czy pasuje do `Challenge` z pierwszego kroku. 
Dzięki temu, nawet w przypadku przechwycenia kodu w przeglądarce, atakujący nie zdobędzie tokenu bez pierwotnego Verifiera.

## Kontrola Dostępu (RBAC)
Endpoint `/users` dla metody `POST` został dodatkowo zabezpieczony na poziomie API Gateway. Tylko użytkownicy posiadający rolę `admin` w tokenie JWT (w sekcji `realm_access.roles`) mogą dodać nowe zasoby do bazy danych.

## Jak uruchomić projekt?
1. Pobierz repozytorium.
2. Uruchom kontenery w tle:
   ```bash
   docker compose up -d --build
3. Zaloguj się do Keycloaka (http://localhost:8080/admin/, login/hasło: admin/admin) i skonfiguruj Realm, Klienta, Role i Użytkownika.
4. Przejdź do folderu frontendu, zainstaluj zależności i uruchom aplikację:

```bash
cd frontend
npm install
npm run dev
```
5. Aplikacja kliencka jest dostępna pod adresem http://localhost:5173