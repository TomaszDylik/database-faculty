CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP');

CREATE TYPE "ConversationMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

ALTER TABLE "conversations"
ALTER COLUMN "title" DROP NOT NULL,
ADD COLUMN "type" "ConversationType" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN "next_message_seq" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "conversation_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" "ConversationMemberRole" NOT NULL DEFAULT 'MEMBER',
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "message_pointers" (
  "conversation_id" UUID NOT NULL,
  "seq" INTEGER NOT NULL,
  "mongo_id" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_pointers_pkey" PRIMARY KEY ("conversation_id", "seq")
);

CREATE INDEX "conversations_type_idx" ON "conversations"("type");
CREATE UNIQUE INDEX "conversation_members_conversation_id_user_id_key" ON "conversation_members"("conversation_id", "user_id");
CREATE INDEX "conversation_members_user_id_idx" ON "conversation_members"("user_id");
CREATE UNIQUE INDEX "message_pointers_mongo_id_key" ON "message_pointers"("mongo_id");

ALTER TABLE "conversation_members"
ADD CONSTRAINT "conversation_members_conversation_id_fkey"
FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "conversation_members"
ADD CONSTRAINT "conversation_members_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "message_pointers"
ADD CONSTRAINT "message_pointers_conversation_id_fkey"
FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
