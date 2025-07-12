CREATE TABLE "users" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"first_name" varchar(256),
	"last_name" varchar(256),
	"email" varchar(256),
	"phone" varchar(256),
	"image_url" varchar(2084),
	"joined_at" timestamp,
	"last_sign_in_at" timestamp
);
