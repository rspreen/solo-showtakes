CREATE TYPE "public"."role_name" AS ENUM('curator', 'admin');--> statement-breakpoint
CREATE TABLE "member_role" (
	"member_id" bigint NOT NULL,
	"role" "role_name" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_role_member_id_role_pk" PRIMARY KEY("member_id","role")
);
--> statement-breakpoint
ALTER TABLE "member_role" ADD CONSTRAINT "member_role_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;