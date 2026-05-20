# Omowienie wymagan projektowych

Ten plik tlumaczy kazde wymaganie z `wymagania_projektowe.txt` w 2-3 zdaniach:
- co dane wymaganie ogolnie sprawdza,
- jaki jest sens tego punktu,
- czego uzylem, jak to zrobilem i gdzie to jest,
- czy punkt jest realnie zrobiony, partial, czy jeszcze brakuje.

## Wymagania techniczne T1-T8

### T1 - sterownik pg [PARTIAL]

To wymaganie sprawdza niski poziom dostepu do PostgreSQL: singleton puli, parametryzowane SQL i sensowne mapowanie bledow bazy na HTTP. U mnie robi to `pg.Pool` jako singleton w `services/service-pg/src/db/pgPool.js` i `services/service-mongo/src/db/pgPool.js`, a parametryzowane zapytania `$1`, `$2` sa widoczne w `services/service-mongo/src/routes/messages.js` w funkcji `createHybridMessage(...)`. Punkt jest jeszcze partial, bo nie ma jawnej mapy SQLSTATE typu `23505` i `23503` na odpowiedzi HTTP.

### T2 - Knex.js [PARTIAL]

To wymaganie ma pokazac, ze schema PostgreSQL powstaje przez migracje, dane demo sa seedowane, a query builder sluzy tez do realnego filtrowania. U mnie Knex jest skonfigurowany w `services/service-pg/knexfile.js`, ma dwie addytywne migracje w `services/service-pg/db/migrations` i seed domenowy w `services/service-pg/db/seeds/001_seed_users_and_conversations.js`. Punkt jest partial, bo Knex realnie robi migracje i seedy, ale nie ma jeszcze endpointu API z dynamicznym `where` budowanym przez Knex bez sklejania SQL stringami.

### T3 - Sequelize v6 [PARTIAL]

To wymaganie bada klasyczny ORM relacyjny: modele, walidacje, relacje, eager loading i transakcje. U mnie Sequelize ma modele `User`, `Conversation` i `ConversationMember` z walidacjami typu `allowNull`, `unique` i `ENUM` w `services/service-pg/src/db/sequelizeModels.js`, a endpoint `POST /conversations/:conversationId/members` uzywa `include` i `sequelize.transaction(...)` w `services/service-pg/src/routes/conversations.js`. Punkt jest partial, bo brakuje jeszcze hooka domenowego typu `beforeCreate` albo `afterCreate`.

### T4 - Prisma [PARTIAL]

To wymaganie ma pokazac relacyjny model w Prismie, historie migracji i prace przez `PrismaClient`. U mnie Prisma jest glowna warstwa relacyjna: modele sa w `services/service-pg/prisma/schema.prisma`, historia migracji w `services/service-pg/prisma/migrations`, endpointy `GET /users`, `GET /users/:userId/conversations` i `POST /conversations` uzywaja `prisma.*`, a healthcheck robi `prisma.$queryRaw` w `services/service-pg/src/routes/health.js`. Formalnie punkt jest partial, bo bardzo dobrze pokazane sa `create` i `read`, ale nie ma jeszcze wyraznych endpointow `update` i `delete`, wiec pelny CRUD nie jest domkniety.

### T5 - MongoDB native driver [ZROBIONE]

To wymaganie sprawdza, czy potrafie zejsc do natywnego sterownika MongoDB, zamiast opierac wszystko na ODM. U mnie `MongoClient` jest singletonem w `services/service-mongo/src/db/mongoClient.js`, jest zamykany przy `SIGINT` i `SIGTERM` w `services/service-mongo/src/server.js`, a endpoint `GET /messages/native-search` pracuje bezposrednio na `collection('messages')` i uzywa operatorow `$in`, `$text`, `$gte`, `$lte` w `services/service-mongo/src/routes/messages.js`. Indeks tekstowy i indeks chronologiczny sa zalozone na kolekcji `messages` w `services/service-mongo/src/models/Message.js`, wiec ten punkt jest merytorycznie obroniony.

### T6 - Mongoose [PARTIAL]

To wymaganie ma pokazac dojrzale uzycie Mongoose, a nie tylko prosty model dokumentu. U mnie sa dwa schematy w sensie Mongoose: `messageSchema` i zagniezdzony `attachmentSchema`, sa wbudowane walidacje typu `required`, `maxlength`, `enum` i `min`, a model `Message` obsluguje `create`, `find`, `countDocuments` i `aggregate` w `services/service-mongo/src/models/Message.js` oraz `services/service-mongo/src/routes/messages.js`. Punkt jest partial, bo nie ma jeszcze custom validatorow, `schema.pre(...)`, `populate(...)` ani `methods` / `statics`.

### T7 - Aggregation Pipeline [ZROBIONE]

To wymaganie bada, czy analityka jest liczona w MongoDB pipeline'em, a nie po stronie Node.js. U mnie endpoint `GET /analytics/messages/daily` buduje pipeline z `\$match`, `\$group`, `\$project`, `\$lookup` i `\$sort`, a pierwszy `\$match` filtruje po `conversationId`, co ma sens pod indeks listujacy wiadomosci. W kodzie siedzi to w funkcji `buildDailyAnalyticsPipeline(...)` i wywolaniu `Message.aggregate(...)` w `services/service-mongo/src/routes/messages.js`.

### T8a - Konteneryzacja [PARTIAL]

To wymaganie sprawdza operacyjna gotowosc kontenerow: healthchecki, depends_on, plik `.env.example` i wieloetapowe buildy. U mnie `docker-compose.yml` ma `healthcheck`, `depends_on` z `service_healthy`, jest `.env.example`, a wszystkie trzy serwisy Node buduja sie z multi-stage Dockerfile'ow w `services/service-pg/Dockerfile`, `services/service-mongo/Dockerfile` i `services/api-gateway/Dockerfile`. Punkt jest partial, bo samo `docker compose up` nie wykonuje jeszcze automatycznie migracji i seedow; po starcie nadal trzeba zrobic `db:setup` i seedy recznie albo helperem.

### T8b - Mikroserwisy [ZROBIONE]

To wymaganie dotyczy rozdzialu systemu na osobne serwisy i ich komunikacji. U mnie sa trzy serwisy Node w oddzielnych kontenerach: `service-pg`, `service-mongo` i `api-gateway`, podzial jest per silnik danych, a gateway komunikuje sie z downstreamami przez HTTP w `services/api-gateway/src/routes/health.js`; migracje i seedy sa odpalane z poziomu Compose i skryptow w glownym `package.json`. Sam gateway nie proxy'uje jeszcze ruchu biznesowego, ale architektoniczny punkt mikroserwisow jest juz czytelnie pokazany w `docker-compose.yml` i katalogu `services/`.

### T8c - Architektura hybrydowa [MOCNE, ALE NIE IDEALNE]

To wymaganie sprawdza spojnosc miedzy dwiema bazami i ujednolicony format bledow. U mnie `POST /messages` najpierw zapisuje dokument w MongoDB, potem w transakcji PostgreSQL robi `FOR UPDATE`, zapis do `message_pointers` i update `conversations`, a przy bledzie usuwa dokument przez kompensacje; biznesowe odpowiedzi bledu ida przez `sendError(...)` jako `{ error, code, details }` w `services/service-mongo/src/routes/messages.js`. Punkt jest bardzo mocny od strony samej operacji hybrydowej, ale warto uczciwie powiedziec, ze format bledu jest najbardziej rowny w endpointach biznesowych, a nie doslownie we wszystkich odpowiedziach serwisow.

## Wymagania dodatkowe

### README i opis architektury [ZROBIONE]

To wymaganie sprawdza, czy repo da sie zrozumiec i uruchomic bez dopowiadania wszystkiego ustnie. U mnie `README.md` opisuje start przez Compose, zmienne srodowiskowe, podzial serwisow i przeplyw danych PG/Mongo z diagramem Mermaid, a uruchomienie wspiera tez `.env.example` i `docker-compose.yml`. Ten punkt jest zrobiony, bo dokumentacja daje realny obraz architektury i przeplywu danych.

### OpenAPI / kontrakt REST [ZROBIONE W WARIANCIE ROWNOWAZNYM]

To wymaganie nie musi oznaczac formalnego pliku OpenAPI 3.x, bo specyfikacja dopuszcza rownowazny kontrakt REST z przykladami. U mnie w `README.md` jest lista endpointow, przykladowe requesty i odpowiedzi, a dodatkowo jest gotowa kolekcja `postman/database-faculty.postman_collection.json`, wiec kontrakt API jest publikowalny mimo braku osobnego pliku OpenAPI. Gdyby prowadzacy chcial stricte OpenAPI YAML/JSON, bylby to brak formatu, a nie brak merytorycznego opisu.

### Testy automatyczne [BRAK]

To wymaganie sprawdza, czy krytyczne scenariusze sa zabezpieczone automatycznie przed regresja. W obecnym repo nie ma testow integracyjnych ani e2e, co widac po braku plikow testowych i braku frameworka testowego; obecnie masz tylko testowanie manualne przez Postmana i opisy w `README.md`. Ten punkt trzeba uczciwie oznaczyc jako brak, a najlepsze pierwsze testy to `POST /messages`, `403` bez czlonkostwa, reguly `OWNER/ADMIN` i endpoint analityczny.

### Bezpieczenstwo podstawowe [PARTIAL]

To wymaganie bada podstawowa higiene API: walidacje wejscia, brak stack trace do klienta i krotki opis zagrozen. U mnie walidacja jest reczna w endpointach, odpowiedzi bledow nie odslaniaja `error.stack`, a `README.md` ma sekcje `Bezpieczenstwo i znane ograniczenia`; widac to glownie w `services/service-pg/src/routes/*.js`, `services/service-mongo/src/routes/messages.js` i `README.md`. Punkt jest partial, bo brak auth, rate limitingu i nie ma pelnego mapowania wszystkich bledow SQL/Mongo na statusy HTTP.

## Wymagania specyficzne dla projektu

### Model relacyjny: uzytkownicy, konwersacje, czlonkostwo [ZROBIONE]

To wymaganie sprawdza, czy relacyjna czesc systemu trzyma to, co wymaga integralnosci i silnych relacji. U mnie PostgreSQL przechowuje `users`, `conversations`, `conversation_members` i `message_pointers`, a role, typ konwersacji i kolejnosc wiadomosci sa modelowane w `services/service-pg/prisma/schema.prisma`; dane demo dopelnia `services/service-pg/db/seeds/001_seed_users_and_conversations.js`. To jest jeden z najmocniejszych punktow projektu, bo model relacyjny rzeczywiscie pilnuje czlonkostwa, porzadku i powiazan.

### Model dokumentowy: wiadomosci i metadane [ZROBIONE]

To wymaganie bada, czy tresc wiadomosci i zalaczniki sa modelowane po dokumentowemu, a nie na sile relacyjnie. U mnie kolekcja `messages` ma `conversationId`, `authorId`, `body`, `createdAt`, `editedAt`, `deliveryStatus` i zagniezdzone `attachments`, do tego indeks chronologiczny i tekstowy oraz endpoint analityczny oparty o agregacje. W kodzie widac to w `services/service-mongo/src/models/Message.js`, `services/service-mongo/src/routes/messages.js` i seedzie `services/service-mongo/db/seeds/001_seed_messages.js`.

### API: konwersacje i wiadomosci [ZROBIONE]

To wymaganie sprawdza podstawowy kontrakt biznesowy systemu czatu. U mnie `service-pg` obsluguje tworzenie konwersacji, liste konwersacji usera i dodawanie czlonkow z regula `OWNER/ADMIN`, a `service-mongo` daje `POST /messages` i `GET /messages` z `limit` oraz `offset`, co jest dopuszczalne przez specyfikacje zamiast kursora. W kodzie siedzi to w `services/service-pg/src/routes/conversations.js`, `services/service-pg/src/routes/users.js` i `services/service-mongo/src/routes/messages.js`, a dlugosc wiadomosci pilnuje Mongoose przez `maxlength` w modelu `Message`.

### Reguly i ograniczenia [PARTIAL]

To wymaganie skupia sie na brzegach domeny, a nie tylko na samym CRUD-zie. U mnie blokada wysylki bez czlonkostwa jest zrobiona i zwraca `403`, a czesc relacji ma ustawione `onDelete`, ale nie ma jeszcze jawnego endpointu usuwania usera, polityki historii po usunieciu konta ani idempotencji przez `clientMessageId`; mapowanie bledow bazodanowych na HTTP jest tylko czesciowe. W praktyce widac to glownie w `services/service-mongo/src/routes/messages.js`, `services/service-pg/prisma/schema.prisma` i sekcji ograniczen w `README.md`.

### Operacja hybrydowa [ZROBIONE]

To wymaganie ma pokazac prawdziwy problem spojnoscowy miedzy dwoma silnikami danych. U mnie `POST /messages` najpierw zapisuje dokument w MongoDB, potem w lokalnej transakcji PostgreSQL aktualizuje `message_pointers`, `last_message_at` i `next_message_seq`, a w `catch` kasuje zapisany dokument jako kompensacje. Cala logika siedzi w `createHybridMessage(...)` w `services/service-mongo/src/routes/messages.js`, a relacyjna strona mapowania jest opisana w `services/service-pg/prisma/schema.prisma`.

## Szybki bilans

### Najmocniej obronione

- T5 - MongoDB native driver
- T7 - Aggregation Pipeline
- T8b - Mikroserwisy
- README i opis architektury
- OpenAPI / kontrakt REST w wariancie rownowaznym
- Model relacyjny
- Model dokumentowy
- API: konwersacje i wiadomosci
- Operacja hybrydowa

### Czesc zrobiona, ale uczciwie niepelna

- T1 - brak jawnego mapowania SQLSTATE na HTTP
- T2 - brak endpointu Knex z dynamicznym `where`
- T3 - brak hooka domenowego w Sequelize
- T4 - brak pelnego `update` i `delete` przez Prisma
- T6 - brak custom validatorow, hooka, populate i methods/statics
- T8a - bootstrap po `docker compose up` nie jest zero-touch
- T8c - format bledu nie jest identyczny we wszystkich odpowiedziach
- Bezpieczenstwo podstawowe - brak auth, rate limitingu i pelnego mapowania bledow BD
- Reguly i ograniczenia - brak polityki usuniecia usera i idempotencji

### Jawny brak

- Testy automatyczne