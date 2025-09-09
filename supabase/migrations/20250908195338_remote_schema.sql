create extension if not exists "http" with schema "public";

create type "public"."event_type_enum" as enum ('training', 'group');

create type "public"."event_type_enum_new" as enum ('training', 'group');

create type "public"."purpose_enum" as enum ('lucro', 'satisfacao', 'bonus');


  create table "public"."class_players" (
    "id" uuid not null default gen_random_uuid(),
    "player_id" uuid,
    "joined_at" timestamp with time zone default now(),
    "total_matches" integer default 0,
    "class_id" uuid,
    "avg_score" numeric
      );


alter table "public"."class_players" enable row level security;


  create table "public"."classes" (
    "id" uuid not null default gen_random_uuid(),
    "code" text not null,
    "description" text,
    "instructor_id" uuid,
    "influencer_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."classes" enable row level security;


  create table "public"."event_participants" (
    "id" uuid not null default gen_random_uuid(),
    "event_id" uuid,
    "player_id" uuid,
    "status" text not null default 'invited'::text,
    "invited_at" timestamp with time zone default now(),
    "participated_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."event_participants" enable row level security;


  create table "public"."events" (
    "id" uuid not null default gen_random_uuid(),
    "name" text,
    "code" text not null,
    "description" text,
    "subject" text,
    "difficulty" text default 'medium'::text,
    "time_limit" integer default 30,
    "max_players" integer default 50,
    "instructions" text,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "instructor_id" uuid,
    "event_id_legacy" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "class_id" uuid,
    "event_type" event_type_enum not null default 'training'::event_type_enum,
    "schedule" jsonb default '[]'::jsonb
      );


alter table "public"."events" enable row level security;


  create table "public"."influencers" (
    "id" uuid not null default gen_random_uuid(),
    "name" text,
    "email" text,
    "udf_id" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."influencers" enable row level security;


  create table "public"."instructor_stats" (
    "instructor_id" uuid not null,
    "classes" integer not null default 0,
    "students" integer not null default 0,
    "matches" integer not null default 0,
    "events" integer not null default 0,
    "leaders" integer not null default 0,
    "totalprofit" numeric not null default 0,
    "profitablematches" integer not null default 0,
    "engagement" integer not null default 0,
    "pioneerrank" integer not null default 0,
    "top10classes" integer not null default 0,
    "top5classes" integer not null default 0,
    "top3classes" integer not null default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."instructor_stats" enable row level security;


  create table "public"."instructors" (
    "id" uuid not null default gen_random_uuid(),
    "name" text,
    "email" text,
    "udf_id" text,
    "app_id" text,
    "external_id" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."instructors" enable row level security;


  create table "public"."match_results" (
    "player_id" uuid not null,
    "match_number" integer not null,
    "lucro" numeric,
    "satisfacao" numeric,
    "bonus" numeric,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "id" uuid not null,
    "event_id" uuid
      );


alter table "public"."match_results" enable row level security;


  create table "public"."matches" (
    "id" uuid not null default gen_random_uuid(),
    "app_serial" text not null,
    "match_date" timestamp with time zone not null,
    "player_id" uuid,
    "match_number" integer default 0,
    "created_at" timestamp with time zone default now(),
    "class_id" uuid,
    "event_id" uuid
      );


alter table "public"."matches" enable row level security;


  create table "public"."players" (
    "id" uuid not null default gen_random_uuid(),
    "name" text,
    "email" text,
    "udf_id" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "registration_number" text,
    "device_indentifier" text,
    "purpose" purpose_enum,
    "team_id" uuid,
    "color" smallint default 1
      );


alter table "public"."players" enable row level security;


  create table "public"."teams" (
    "class_id" uuid,
    "name" text,
    "group_purpose" purpose_enum,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "id" uuid not null default gen_random_uuid()
      );


alter table "public"."teams" enable row level security;

CREATE UNIQUE INDEX class_players_pkey ON public.class_players USING btree (id);

CREATE UNIQUE INDEX classes_code_key ON public.classes USING btree (code);

CREATE UNIQUE INDEX classes_pkey ON public.classes USING btree (id);

CREATE UNIQUE INDEX event_participants_event_id_player_id_key ON public.event_participants USING btree (event_id, player_id);

CREATE UNIQUE INDEX event_participants_pkey ON public.event_participants USING btree (id);

CREATE UNIQUE INDEX events_code_key ON public.events USING btree (code);

CREATE UNIQUE INDEX events_pkey ON public.events USING btree (id);

CREATE INDEX idx_class_players_player_id ON public.class_players USING btree (player_id);

CREATE INDEX idx_classes_code ON public.classes USING btree (code);

CREATE INDEX idx_classes_instructor_id ON public.classes USING btree (instructor_id);

CREATE INDEX idx_event_participants_event_id ON public.event_participants USING btree (event_id);

CREATE INDEX idx_event_participants_player_id ON public.event_participants USING btree (player_id);

CREATE INDEX idx_event_participants_status ON public.event_participants USING btree (status);

CREATE INDEX idx_events_class_id ON public.events USING btree (class_id);

CREATE INDEX idx_events_code ON public.events USING btree (code);

CREATE INDEX idx_events_event_type ON public.events USING btree (event_type);

CREATE INDEX idx_events_instructor_id ON public.events USING btree (instructor_id);

CREATE INDEX idx_influencers_udf_id ON public.influencers USING btree (udf_id);

CREATE INDEX idx_instructor_stats_instructor_id ON public.instructor_stats USING btree (instructor_id);

CREATE INDEX idx_instructors_app_id ON public.instructors USING btree (app_id);

CREATE INDEX idx_instructors_external_id ON public.instructors USING btree (external_id);

CREATE INDEX idx_instructors_udf_id ON public.instructors USING btree (udf_id);

CREATE INDEX idx_match_results_player_id ON public.match_results USING btree (player_id);

CREATE INDEX idx_matches_player_id ON public.matches USING btree (player_id);

CREATE INDEX idx_players_udf_id ON public.players USING btree (udf_id);

CREATE INDEX idx_teams_class_id ON public.teams USING btree (class_id);

CREATE INDEX idx_teams_created_by ON public.teams USING btree (created_by);

CREATE UNIQUE INDEX influencers_email_unique ON public.influencers USING btree (email);

CREATE UNIQUE INDEX influencers_pkey ON public.influencers USING btree (id);

CREATE UNIQUE INDEX influencers_udf_id_key ON public.influencers USING btree (udf_id);

CREATE UNIQUE INDEX instructor_stats_pkey ON public.instructor_stats USING btree (instructor_id);

CREATE UNIQUE INDEX instructors_app_id_key ON public.instructors USING btree (app_id);

CREATE UNIQUE INDEX instructors_pkey ON public.instructors USING btree (id);

CREATE UNIQUE INDEX instructors_udf_id_key ON public.instructors USING btree (udf_id);

CREATE UNIQUE INDEX match_results_pkey ON public.match_results USING btree (id);

CREATE UNIQUE INDEX matches_pkey ON public.matches USING btree (id);

CREATE UNIQUE INDEX players_pkey ON public.players USING btree (id);

CREATE UNIQUE INDEX players_udf_id_key ON public.players USING btree (udf_id);

CREATE UNIQUE INDEX teams_pkey ON public.teams USING btree (id);

CREATE UNIQUE INDEX unique_class_player ON public.class_players USING btree (class_id, player_id);

alter table "public"."class_players" add constraint "class_players_pkey" PRIMARY KEY using index "class_players_pkey";

alter table "public"."classes" add constraint "classes_pkey" PRIMARY KEY using index "classes_pkey";

alter table "public"."event_participants" add constraint "event_participants_pkey" PRIMARY KEY using index "event_participants_pkey";

alter table "public"."events" add constraint "events_pkey" PRIMARY KEY using index "events_pkey";

alter table "public"."influencers" add constraint "influencers_pkey" PRIMARY KEY using index "influencers_pkey";

alter table "public"."instructor_stats" add constraint "instructor_stats_pkey" PRIMARY KEY using index "instructor_stats_pkey";

alter table "public"."instructors" add constraint "instructors_pkey" PRIMARY KEY using index "instructors_pkey";

alter table "public"."match_results" add constraint "match_results_pkey" PRIMARY KEY using index "match_results_pkey";

alter table "public"."matches" add constraint "matches_pkey" PRIMARY KEY using index "matches_pkey";

alter table "public"."players" add constraint "players_pkey" PRIMARY KEY using index "players_pkey";

alter table "public"."teams" add constraint "teams_pkey" PRIMARY KEY using index "teams_pkey";

alter table "public"."class_players" add constraint "class_players_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) not valid;

alter table "public"."class_players" validate constraint "class_players_class_id_fkey";

alter table "public"."class_players" add constraint "class_players_player_id_fkey" FOREIGN KEY (player_id) REFERENCES players(id) not valid;

alter table "public"."class_players" validate constraint "class_players_player_id_fkey";

alter table "public"."class_players" add constraint "unique_class_player" UNIQUE using index "unique_class_player";

alter table "public"."classes" add constraint "classes_code_key" UNIQUE using index "classes_code_key";

alter table "public"."classes" add constraint "classes_influencer_id_fkey" FOREIGN KEY (influencer_id) REFERENCES influencers(id) not valid;

alter table "public"."classes" validate constraint "classes_influencer_id_fkey";

alter table "public"."classes" add constraint "classes_instructor_id_fkey" FOREIGN KEY (instructor_id) REFERENCES instructors(id) not valid;

alter table "public"."classes" validate constraint "classes_instructor_id_fkey";

alter table "public"."event_participants" add constraint "chk_event_participants_status" CHECK ((status = ANY (ARRAY['invited'::text, 'participated'::text, 'candidate_instructor'::text]))) not valid;

alter table "public"."event_participants" validate constraint "chk_event_participants_status";

alter table "public"."event_participants" add constraint "event_participants_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE not valid;

alter table "public"."event_participants" validate constraint "event_participants_event_id_fkey";

alter table "public"."event_participants" add constraint "event_participants_event_id_player_id_key" UNIQUE using index "event_participants_event_id_player_id_key";

alter table "public"."event_participants" add constraint "event_participants_player_id_fkey" FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE not valid;

alter table "public"."event_participants" validate constraint "event_participants_player_id_fkey";

alter table "public"."events" add constraint "events_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) not valid;

alter table "public"."events" validate constraint "events_class_id_fkey";

alter table "public"."events" add constraint "events_code_key" UNIQUE using index "events_code_key";

alter table "public"."events" add constraint "events_instructor_id_fkey" FOREIGN KEY (instructor_id) REFERENCES instructors(id) not valid;

alter table "public"."events" validate constraint "events_instructor_id_fkey";

alter table "public"."influencers" add constraint "influencers_email_unique" UNIQUE using index "influencers_email_unique";

alter table "public"."influencers" add constraint "influencers_udf_id_key" UNIQUE using index "influencers_udf_id_key";

alter table "public"."instructor_stats" add constraint "instructor_stats_instructor_id_fkey" FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE not valid;

alter table "public"."instructor_stats" validate constraint "instructor_stats_instructor_id_fkey";

alter table "public"."instructors" add constraint "instructors_app_id_key" UNIQUE using index "instructors_app_id_key";

alter table "public"."instructors" add constraint "instructors_udf_id_key" UNIQUE using index "instructors_udf_id_key";

alter table "public"."match_results" add constraint "match_results_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) not valid;

alter table "public"."match_results" validate constraint "match_results_event_id_fkey";

alter table "public"."match_results" add constraint "match_results_player_id_fkey" FOREIGN KEY (player_id) REFERENCES players(id) not valid;

alter table "public"."match_results" validate constraint "match_results_player_id_fkey";

alter table "public"."matches" add constraint "matches_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) not valid;

alter table "public"."matches" validate constraint "matches_class_id_fkey";

alter table "public"."matches" add constraint "matches_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) not valid;

alter table "public"."matches" validate constraint "matches_event_id_fkey";

alter table "public"."matches" add constraint "matches_player_id_fkey" FOREIGN KEY (player_id) REFERENCES players(id) not valid;

alter table "public"."matches" validate constraint "matches_player_id_fkey";

alter table "public"."players" add constraint "players_team_id_fkey" FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL not valid;

alter table "public"."players" validate constraint "players_team_id_fkey";

alter table "public"."players" add constraint "players_udf_id_key" UNIQUE using index "players_udf_id_key";

alter table "public"."teams" add constraint "teams_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) not valid;

alter table "public"."teams" validate constraint "teams_class_id_fkey";

alter table "public"."teams" add constraint "teams_created_by_fkey" FOREIGN KEY (created_by) REFERENCES instructors(id) not valid;

alter table "public"."teams" validate constraint "teams_created_by_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_event_participants_with_status(event_id_param uuid)
 RETURNS TABLE(id uuid, event_id uuid, player_id uuid, player_name text, player_email text, status text, invited_at timestamp with time zone, participated_at timestamp with time zone, total_matches bigint, can_promote_to_instructor boolean)
 LANGUAGE plpgsql
AS $function$
  BEGIN
    RETURN QUERY
    SELECT
      ep.id,
      ep.event_id,
      ep.player_id,
      p.name as player_name,
      p.email as player_email,
      ep.status,
      ep.invited_at,
      ep.participated_at,
      COALESCE(match_count.total, 0) as total_matches,
      (ep.status = 'candidate_instructor'
       AND NOT EXISTS (
         SELECT 1 FROM instructors i WHERE i.email = p.email
       )) as can_promote_to_instructor
    FROM event_participants ep
    JOIN players p ON ep.player_id = p.id
    LEFT JOIN (
      SELECT
        mr.player_id,
        mr.event_id,
        COUNT(*) as total
      FROM match_results mr
      WHERE mr.event_id = event_id_param
      GROUP BY mr.player_id, mr.event_id
    ) match_count ON match_count.player_id = ep.player_id
      AND match_count.event_id = ep.event_id
    WHERE ep.event_id = event_id_param
    ORDER BY
      CASE ep.status
        WHEN 'candidate_instructor' THEN 1
        WHEN 'participated' THEN 2
        WHEN 'invited' THEN 3
      END,
      ep.invited_at;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.handle_class_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM recalculate_instructor_stats(NEW.instructor_id);
        IF TG_OP = 'UPDATE' AND OLD.instructor_id IS DISTINCT FROM NEW.instructor_id THEN
            PERFORM recalculate_instructor_stats(OLD.instructor_id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM recalculate_instructor_stats(OLD.instructor_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_class_players_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  DECLARE
      instructor_uuid uuid;
  BEGIN
      IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
          SELECT instructor_id INTO instructor_uuid FROM classes WHERE id = NEW.class_id;
          IF instructor_uuid IS NOT NULL THEN
              PERFORM recalculate_instructor_stats(instructor_uuid);
          END IF;

          IF TG_OP = 'UPDATE' AND OLD.class_id IS DISTINCT FROM NEW.class_id THEN
              SELECT instructor_id INTO instructor_uuid FROM classes WHERE id = OLD.class_id;
              IF instructor_uuid IS NOT NULL THEN
                  PERFORM recalculate_instructor_stats(instructor_uuid);
              END IF;
          END IF;
          RETURN NEW;

      ELSIF TG_OP = 'DELETE' THEN
          SELECT instructor_id INTO instructor_uuid FROM classes WHERE id = OLD.class_id;
          IF instructor_uuid IS NOT NULL THEN
              PERFORM recalculate_instructor_stats(instructor_uuid);
          END IF;
          RETURN OLD;
      END IF;
      RETURN NULL;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.handle_direct_instructor_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM recalculate_instructor_stats(NEW.instructor_id);
        
        IF TG_OP = 'UPDATE' AND OLD.instructor_id IS DISTINCT FROM NEW.instructor_id THEN
            PERFORM recalculate_instructor_stats(OLD.instructor_id);
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        PERFORM recalculate_instructor_stats(OLD.instructor_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_match_results_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  DECLARE
      instructor_uuid uuid;
  BEGIN
      IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
          SELECT c.instructor_id INTO instructor_uuid
          FROM classes c
          JOIN events e ON c.id = e.class_id
          WHERE e.id = NEW.event_id;

          IF instructor_uuid IS NOT NULL THEN
              PERFORM recalculate_instructor_stats(instructor_uuid);
          END IF;

          IF TG_OP = 'UPDATE' AND OLD.event_id != NEW.event_id THEN
              SELECT c.instructor_id INTO instructor_uuid
              FROM classes c
              JOIN events e ON c.id = e.class_id
              WHERE e.id = OLD.event_id;
              IF instructor_uuid IS NOT NULL THEN
                  PERFORM recalculate_instructor_stats(instructor_uuid);
              END IF;
          END IF;

          RETURN NEW;
      END IF;

      IF TG_OP = 'DELETE' THEN
          SELECT c.instructor_id INTO instructor_uuid
          FROM classes c
          JOIN events e ON c.id = e.class_id
          WHERE e.id = OLD.event_id;
          IF instructor_uuid IS NOT NULL THEN
              PERFORM recalculate_instructor_stats(instructor_uuid);
          END IF;
          RETURN OLD;
      END IF;

      RETURN NULL;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.handle_related_table_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  DECLARE
      instructor_uuid_new uuid;
      instructor_uuid_old uuid;
      class_id_new uuid;
      class_id_old uuid;
  BEGIN
      IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
          -- Obter class_id via event_id
          SELECT class_id INTO class_id_new FROM events WHERE id = NEW.event_id;

          SELECT instructor_id INTO instructor_uuid_new FROM classes WHERE id = class_id_new;
          IF instructor_uuid_new IS NOT NULL THEN
              PERFORM recalculate_instructor_stats(instructor_uuid_new);
          END IF;

          IF TG_OP = 'UPDATE' THEN
              -- Para UPDATE, obter class_id do evento anterior também
              SELECT class_id INTO class_id_old FROM events WHERE id = OLD.event_id;

              IF class_id_old IS DISTINCT FROM class_id_new THEN
                  SELECT instructor_id INTO instructor_uuid_old FROM classes WHERE id = class_id_old;
                  IF instructor_uuid_old IS NOT NULL THEN
                      PERFORM recalculate_instructor_stats(instructor_uuid_old);
                  END IF;
              END IF;
          END IF;
          RETURN NEW;

      ELSIF TG_OP = 'DELETE' THEN
          SELECT class_id INTO class_id_old FROM events WHERE id = OLD.event_id;
          SELECT instructor_id INTO instructor_uuid_old FROM classes WHERE id = class_id_old;
          IF instructor_uuid_old IS NOT NULL THEN
              PERFORM recalculate_instructor_stats(instructor_uuid_old);
          END IF;
          RETURN OLD;
      END IF;
      RETURN NULL;
  END;
  $function$
;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'http_header' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        CREATE TYPE "public"."http_header" AS ("field" character varying, "value" character varying);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'http_request' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        CREATE TYPE "public"."http_request" AS ("method" http_method, "uri" character varying, "headers" http_header[], "content_type" character varying, "content" character varying);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'http_response' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        CREATE TYPE "public"."http_response" AS ("status" integer, "content_type" character varying, "headers" http_header[], "content" character varying);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.recalculate_instructor_stats(instructor_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
  DECLARE
      classes_count integer := 0;
      students_count integer := 0;
      matches_count integer := 0;
      events_count integer := 0;
      leaders_count integer := 0;
      total_profit numeric := 0;
      profitable_matches integer := 0;
      engagement_avg integer := 0;
      pioneer_rank integer := 0;
      top10_classes integer := 0;
      top5_classes integer := 0;
      top3_classes integer := 0;
  BEGIN
      -- Contar turmas (classes) - INALTERADO
      SELECT COUNT(*) INTO classes_count
      FROM classes
      WHERE instructor_id = instructor_uuid;

      -- Contar alunos únicos - INALTERADO
      SELECT COUNT(DISTINCT cp.player_id) INTO students_count
      FROM classes c
      JOIN class_players cp ON c.id = cp.class_id
      WHERE c.instructor_id = instructor_uuid;

      -- Contar partidas (matches) - ATUALIZADO para usar event_id
      SELECT COUNT(m.id) INTO matches_count
      FROM classes c
      JOIN events e ON c.id = e.class_id
      JOIN matches m ON e.id = m.event_id
      WHERE c.instructor_id = instructor_uuid;

      -- Contar eventos - CORRIGIDO
      SELECT COUNT(*) INTO events_count
      FROM events e
      JOIN classes c ON e.class_id = c.id
      WHERE c.instructor_id = instructor_uuid;

      -- Contar líderes - INALTERADO
      SELECT COUNT(DISTINCT i.id) INTO leaders_count
      FROM classes c
      JOIN class_players cp ON c.id = cp.class_id
      JOIN instructors i ON cp.player_id = i.id
      WHERE c.instructor_id = instructor_uuid AND c.instructor_id != i.id;

      -- Calcular lucro total e partidas com lucro - ATUALIZADO para usar event_id
      SELECT
          COALESCE(SUM(mr.lucro), 0),
          COALESCE(SUM(CASE WHEN mr.lucro > 0 THEN 1 ELSE 0 END), 0)
      INTO total_profit, profitable_matches
      FROM classes c
      JOIN events e ON c.id = e.class_id
      JOIN match_results mr ON e.id = mr.event_id
      WHERE c.instructor_id = instructor_uuid;

      -- Calcular engajamento - ATUALIZADO para usar event_id
      SELECT COALESCE(ROUND(AVG(mr.satisfacao)), 0) INTO engagement_avg
      FROM classes c
      JOIN events e ON c.id = e.class_id
      JOIN match_results mr ON e.id = mr.event_id
      WHERE c.instructor_id = instructor_uuid AND mr.satisfacao IS NOT NULL;

      -- Calcular rank de pioneiro - INALTERADO
      WITH pioneer_ranking AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rank
          FROM instructors
          ORDER BY created_at ASC
          LIMIT 100
      )
      SELECT COALESCE(pr.rank, 0) INTO pioneer_rank
      FROM pioneer_ranking pr
      WHERE pr.id = instructor_uuid;

      -- Calcular ranking de turmas - ATUALIZADO para usar event_id
      WITH class_rankings AS (
          SELECT
              c.id,
              ROW_NUMBER() OVER (ORDER BY COALESCE(AVG(mr.lucro), 0) DESC, c.id ASC) as rank
          FROM classes c
          LEFT JOIN events e ON c.id = e.class_id
          LEFT JOIN match_results mr ON e.id = mr.event_id
          GROUP BY c.id, c.instructor_id
      )
      SELECT
          COUNT(*) FILTER (WHERE cr.rank <= 10),
          COUNT(*) FILTER (WHERE cr.rank <= 5),
          COUNT(*) FILTER (WHERE cr.rank <= 3)
      INTO top10_classes, top5_classes, top3_classes
      FROM class_rankings cr
      WHERE cr.id IN (SELECT id FROM classes WHERE instructor_id = instructor_uuid);

      -- Inserir ou atualizar (UPSERT) - INALTERADO
      INSERT INTO instructor_stats (
          instructor_id, classes, students, matches, events, leaders,
          totalprofit, profitablematches, engagement, pioneerrank,
          top10classes, top5classes, top3classes, updated_at
      ) VALUES (
          instructor_uuid, classes_count, students_count, matches_count, events_count, leaders_count,
          total_profit, profitable_matches, engagement_avg, pioneer_rank,
          top10_classes, top5_classes, top3_classes, NOW()
      )
      ON CONFLICT (instructor_id)
      DO UPDATE SET
          classes = EXCLUDED.classes,
          students = EXCLUDED.students,
          matches = EXCLUDED.matches,
          events = EXCLUDED.events,
          leaders = EXCLUDED.leaders,
          totalprofit = EXCLUDED.totalprofit,
          profitablematches = EXCLUDED.profitablematches,
          engagement = EXCLUDED.engagement,
          pioneerrank = EXCLUDED.pioneerrank,
          top10classes = EXCLUDED.top10classes,
          top5classes = EXCLUDED.top5classes,
          top3classes = EXCLUDED.top3classes,
          updated_at = EXCLUDED.updated_at;

      RAISE LOG 'Instructor stats updated for instructor_id: %', instructor_uuid;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.trigger_calculate_match_results()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  DECLARE
      player_udf_id_val TEXT;
      event_code_val TEXT;
      match_number_val INTEGER;
      edge_function_url TEXT;
      supabase_anon_key TEXT;
      http_response http_response;
  BEGIN
      IF NEW.app_serial IS NULL OR NEW.app_serial = '' THEN
          RAISE LOG 'app_serial está vazio para match_id: %, pulando cálculo de resultados', NEW.id;
          RETURN NEW;
      END IF;

      edge_function_url := current_setting('app.settings.edge_function_url', true);
      supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);

      IF edge_function_url IS NULL OR edge_function_url = '' THEN
          edge_function_url := 'https://xfgsfmexaxmikkksndny.supabase.co/functions/v1/webhook-match-results';
          RAISE LOG 'Usando URL padrão da Edge Function: %', edge_function_url;
      END IF;

      IF supabase_anon_key IS NULL OR supabase_anon_key = '' THEN
          supabase_anon_key := 'your-anon-key-here';
          RAISE LOG 'Usando anon key padrão (configure app.settings.supabase_anon_key)';
      END IF;

      -- Buscar player udf_id
      SELECT udf_id INTO player_udf_id_val
      FROM public.players
      WHERE id = NEW.player_id;

      -- Buscar event_code diretamente
      SELECT code INTO event_code_val
      FROM public.events
      WHERE id = NEW.event_id;

      match_number_val := COALESCE(NEW.match_number, 0);

      IF player_udf_id_val IS NULL THEN
          RAISE LOG 'Player não encontrado para player_id: %, pulando cálculo', NEW.player_id;
          RETURN NEW;
      END IF;

      IF event_code_val IS NULL THEN
          RAISE LOG 'Evento não encontrado para event_id: %, pulando cálculo', NEW.event_id;
          RETURN NEW;
      END IF;

      RAISE LOG 'Chamando Edge Function para: player_udf_id=%, event_code=%, match_number=%',
                player_udf_id_val, event_code_val, match_number_val;

      BEGIN
          SELECT * INTO http_response FROM http_post(
              edge_function_url,
              json_build_object(
                  'player-udf-id', player_udf_id_val,
                  'event-code', event_code_val,
                  'match-number', match_number_val
              )::text,
              'application/json',
              ARRAY[
                  ROW('apikey', supabase_anon_key)::http_header,
                  ROW('Authorization', 'Bearer ' || supabase_anon_key)::http_header
              ]
          );

          RAISE LOG 'Edge Function respondeu com status: %, content: %',
                    http_response.status, http_response.content;

          IF http_response.status >= 200 AND http_response.status < 300 THEN
              RAISE LOG 'Resultados da partida calculados com sucesso para match_id: %', NEW.id;
          ELSE
              RAISE LOG 'Edge Function retornou erro: status=%, content=%',
                        http_response.status, http_response.content;
          END IF;

      EXCEPTION WHEN OTHERS THEN
          RAISE LOG 'Erro ao chamar Edge Function: %, SQLSTATE: %', SQLERRM, SQLSTATE;
      END;

      RETURN NEW;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.update_event_participation_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  BEGIN
    -- Update status to 'participated' when a match result is created
    UPDATE event_participants
    SET
      status = CASE
        WHEN status = 'invited' THEN 'participated'
        ELSE status
      END,
      participated_at = CASE
        WHEN status = 'invited' THEN NEW.created_at
        ELSE participated_at
      END,
      updated_at = now()
    WHERE event_id = NEW.event_id
      AND player_id = NEW.player_id
      AND status = 'invited';

    -- If it's a training event, update to candidate_instructor
    UPDATE event_participants
    SET
      status = 'candidate_instructor',
      updated_at = now()
    WHERE event_id = NEW.event_id
      AND player_id = NEW.player_id
      AND status = 'participated'
      AND EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = NEW.event_id
        AND e.event_type = 'training'
      );

    RETURN NEW;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.update_player_match_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  DECLARE
      class_id_val uuid;
  BEGIN
      -- Obter class_id via event_id
      SELECT class_id INTO class_id_val FROM events WHERE id = NEW.event_id;

      UPDATE public.class_players
      SET total_matches = total_matches + 1
      WHERE player_id = NEW.player_id AND class_id = class_id_val;

      RETURN NEW;
  END;
  $function$
;

grant delete on table "public"."class_players" to "anon";

grant insert on table "public"."class_players" to "anon";

grant references on table "public"."class_players" to "anon";

grant select on table "public"."class_players" to "anon";

grant trigger on table "public"."class_players" to "anon";

grant truncate on table "public"."class_players" to "anon";

grant update on table "public"."class_players" to "anon";

grant delete on table "public"."class_players" to "authenticated";

grant insert on table "public"."class_players" to "authenticated";

grant references on table "public"."class_players" to "authenticated";

grant select on table "public"."class_players" to "authenticated";

grant trigger on table "public"."class_players" to "authenticated";

grant truncate on table "public"."class_players" to "authenticated";

grant update on table "public"."class_players" to "authenticated";

grant delete on table "public"."class_players" to "service_role";

grant insert on table "public"."class_players" to "service_role";

grant references on table "public"."class_players" to "service_role";

grant select on table "public"."class_players" to "service_role";

grant trigger on table "public"."class_players" to "service_role";

grant truncate on table "public"."class_players" to "service_role";

grant update on table "public"."class_players" to "service_role";

grant delete on table "public"."classes" to "anon";

grant insert on table "public"."classes" to "anon";

grant references on table "public"."classes" to "anon";

grant select on table "public"."classes" to "anon";

grant trigger on table "public"."classes" to "anon";

grant truncate on table "public"."classes" to "anon";

grant update on table "public"."classes" to "anon";

grant delete on table "public"."classes" to "authenticated";

grant insert on table "public"."classes" to "authenticated";

grant references on table "public"."classes" to "authenticated";

grant select on table "public"."classes" to "authenticated";

grant trigger on table "public"."classes" to "authenticated";

grant truncate on table "public"."classes" to "authenticated";

grant update on table "public"."classes" to "authenticated";

grant delete on table "public"."classes" to "service_role";

grant insert on table "public"."classes" to "service_role";

grant references on table "public"."classes" to "service_role";

grant select on table "public"."classes" to "service_role";

grant trigger on table "public"."classes" to "service_role";

grant truncate on table "public"."classes" to "service_role";

grant update on table "public"."classes" to "service_role";

grant delete on table "public"."event_participants" to "anon";

grant insert on table "public"."event_participants" to "anon";

grant references on table "public"."event_participants" to "anon";

grant select on table "public"."event_participants" to "anon";

grant trigger on table "public"."event_participants" to "anon";

grant truncate on table "public"."event_participants" to "anon";

grant update on table "public"."event_participants" to "anon";

grant delete on table "public"."event_participants" to "authenticated";

grant insert on table "public"."event_participants" to "authenticated";

grant references on table "public"."event_participants" to "authenticated";

grant select on table "public"."event_participants" to "authenticated";

grant trigger on table "public"."event_participants" to "authenticated";

grant truncate on table "public"."event_participants" to "authenticated";

grant update on table "public"."event_participants" to "authenticated";

grant delete on table "public"."event_participants" to "service_role";

grant insert on table "public"."event_participants" to "service_role";

grant references on table "public"."event_participants" to "service_role";

grant select on table "public"."event_participants" to "service_role";

grant trigger on table "public"."event_participants" to "service_role";

grant truncate on table "public"."event_participants" to "service_role";

grant update on table "public"."event_participants" to "service_role";

grant delete on table "public"."events" to "anon";

grant insert on table "public"."events" to "anon";

grant references on table "public"."events" to "anon";

grant select on table "public"."events" to "anon";

grant trigger on table "public"."events" to "anon";

grant truncate on table "public"."events" to "anon";

grant update on table "public"."events" to "anon";

grant delete on table "public"."events" to "authenticated";

grant insert on table "public"."events" to "authenticated";

grant references on table "public"."events" to "authenticated";

grant select on table "public"."events" to "authenticated";

grant trigger on table "public"."events" to "authenticated";

grant truncate on table "public"."events" to "authenticated";

grant update on table "public"."events" to "authenticated";

grant delete on table "public"."events" to "service_role";

grant insert on table "public"."events" to "service_role";

grant references on table "public"."events" to "service_role";

grant select on table "public"."events" to "service_role";

grant trigger on table "public"."events" to "service_role";

grant truncate on table "public"."events" to "service_role";

grant update on table "public"."events" to "service_role";

grant delete on table "public"."influencers" to "anon";

grant insert on table "public"."influencers" to "anon";

grant references on table "public"."influencers" to "anon";

grant select on table "public"."influencers" to "anon";

grant trigger on table "public"."influencers" to "anon";

grant truncate on table "public"."influencers" to "anon";

grant update on table "public"."influencers" to "anon";

grant delete on table "public"."influencers" to "authenticated";

grant insert on table "public"."influencers" to "authenticated";

grant references on table "public"."influencers" to "authenticated";

grant select on table "public"."influencers" to "authenticated";

grant trigger on table "public"."influencers" to "authenticated";

grant truncate on table "public"."influencers" to "authenticated";

grant update on table "public"."influencers" to "authenticated";

grant delete on table "public"."influencers" to "service_role";

grant insert on table "public"."influencers" to "service_role";

grant references on table "public"."influencers" to "service_role";

grant select on table "public"."influencers" to "service_role";

grant trigger on table "public"."influencers" to "service_role";

grant truncate on table "public"."influencers" to "service_role";

grant update on table "public"."influencers" to "service_role";

grant delete on table "public"."instructor_stats" to "anon";

grant insert on table "public"."instructor_stats" to "anon";

grant references on table "public"."instructor_stats" to "anon";

grant select on table "public"."instructor_stats" to "anon";

grant trigger on table "public"."instructor_stats" to "anon";

grant truncate on table "public"."instructor_stats" to "anon";

grant update on table "public"."instructor_stats" to "anon";

grant delete on table "public"."instructor_stats" to "authenticated";

grant insert on table "public"."instructor_stats" to "authenticated";

grant references on table "public"."instructor_stats" to "authenticated";

grant select on table "public"."instructor_stats" to "authenticated";

grant trigger on table "public"."instructor_stats" to "authenticated";

grant truncate on table "public"."instructor_stats" to "authenticated";

grant update on table "public"."instructor_stats" to "authenticated";

grant delete on table "public"."instructor_stats" to "service_role";

grant insert on table "public"."instructor_stats" to "service_role";

grant references on table "public"."instructor_stats" to "service_role";

grant select on table "public"."instructor_stats" to "service_role";

grant trigger on table "public"."instructor_stats" to "service_role";

grant truncate on table "public"."instructor_stats" to "service_role";

grant update on table "public"."instructor_stats" to "service_role";

grant delete on table "public"."instructors" to "anon";

grant insert on table "public"."instructors" to "anon";

grant references on table "public"."instructors" to "anon";

grant select on table "public"."instructors" to "anon";

grant trigger on table "public"."instructors" to "anon";

grant truncate on table "public"."instructors" to "anon";

grant update on table "public"."instructors" to "anon";

grant delete on table "public"."instructors" to "authenticated";

grant insert on table "public"."instructors" to "authenticated";

grant references on table "public"."instructors" to "authenticated";

grant select on table "public"."instructors" to "authenticated";

grant trigger on table "public"."instructors" to "authenticated";

grant truncate on table "public"."instructors" to "authenticated";

grant update on table "public"."instructors" to "authenticated";

grant delete on table "public"."instructors" to "service_role";

grant insert on table "public"."instructors" to "service_role";

grant references on table "public"."instructors" to "service_role";

grant select on table "public"."instructors" to "service_role";

grant trigger on table "public"."instructors" to "service_role";

grant truncate on table "public"."instructors" to "service_role";

grant update on table "public"."instructors" to "service_role";

grant delete on table "public"."match_results" to "anon";

grant insert on table "public"."match_results" to "anon";

grant references on table "public"."match_results" to "anon";

grant select on table "public"."match_results" to "anon";

grant trigger on table "public"."match_results" to "anon";

grant truncate on table "public"."match_results" to "anon";

grant update on table "public"."match_results" to "anon";

grant delete on table "public"."match_results" to "authenticated";

grant insert on table "public"."match_results" to "authenticated";

grant references on table "public"."match_results" to "authenticated";

grant select on table "public"."match_results" to "authenticated";

grant trigger on table "public"."match_results" to "authenticated";

grant truncate on table "public"."match_results" to "authenticated";

grant update on table "public"."match_results" to "authenticated";

grant delete on table "public"."match_results" to "service_role";

grant insert on table "public"."match_results" to "service_role";

grant references on table "public"."match_results" to "service_role";

grant select on table "public"."match_results" to "service_role";

grant trigger on table "public"."match_results" to "service_role";

grant truncate on table "public"."match_results" to "service_role";

grant update on table "public"."match_results" to "service_role";

grant delete on table "public"."matches" to "anon";

grant insert on table "public"."matches" to "anon";

grant references on table "public"."matches" to "anon";

grant select on table "public"."matches" to "anon";

grant trigger on table "public"."matches" to "anon";

grant truncate on table "public"."matches" to "anon";

grant update on table "public"."matches" to "anon";

grant delete on table "public"."matches" to "authenticated";

grant insert on table "public"."matches" to "authenticated";

grant references on table "public"."matches" to "authenticated";

grant select on table "public"."matches" to "authenticated";

grant trigger on table "public"."matches" to "authenticated";

grant truncate on table "public"."matches" to "authenticated";

grant update on table "public"."matches" to "authenticated";

grant delete on table "public"."matches" to "service_role";

grant insert on table "public"."matches" to "service_role";

grant references on table "public"."matches" to "service_role";

grant select on table "public"."matches" to "service_role";

grant trigger on table "public"."matches" to "service_role";

grant truncate on table "public"."matches" to "service_role";

grant update on table "public"."matches" to "service_role";

grant delete on table "public"."players" to "anon";

grant insert on table "public"."players" to "anon";

grant references on table "public"."players" to "anon";

grant select on table "public"."players" to "anon";

grant trigger on table "public"."players" to "anon";

grant truncate on table "public"."players" to "anon";

grant update on table "public"."players" to "anon";

grant delete on table "public"."players" to "authenticated";

grant insert on table "public"."players" to "authenticated";

grant references on table "public"."players" to "authenticated";

grant select on table "public"."players" to "authenticated";

grant trigger on table "public"."players" to "authenticated";

grant truncate on table "public"."players" to "authenticated";

grant update on table "public"."players" to "authenticated";

grant delete on table "public"."players" to "service_role";

grant insert on table "public"."players" to "service_role";

grant references on table "public"."players" to "service_role";

grant select on table "public"."players" to "service_role";

grant trigger on table "public"."players" to "service_role";

grant truncate on table "public"."players" to "service_role";

grant update on table "public"."players" to "service_role";

grant delete on table "public"."teams" to "anon";

grant insert on table "public"."teams" to "anon";

grant references on table "public"."teams" to "anon";

grant select on table "public"."teams" to "anon";

grant trigger on table "public"."teams" to "anon";

grant truncate on table "public"."teams" to "anon";

grant update on table "public"."teams" to "anon";

grant delete on table "public"."teams" to "authenticated";

grant insert on table "public"."teams" to "authenticated";

grant references on table "public"."teams" to "authenticated";

grant select on table "public"."teams" to "authenticated";

grant trigger on table "public"."teams" to "authenticated";

grant truncate on table "public"."teams" to "authenticated";

grant update on table "public"."teams" to "authenticated";

grant delete on table "public"."teams" to "service_role";

grant insert on table "public"."teams" to "service_role";

grant references on table "public"."teams" to "service_role";

grant select on table "public"."teams" to "service_role";

grant trigger on table "public"."teams" to "service_role";

grant truncate on table "public"."teams" to "service_role";

grant update on table "public"."teams" to "service_role";


  create policy "permit"
  on "public"."class_players"
  as permissive
  for all
  to public
using (true);



  create policy "Instructors can read own classes"
  on "public"."classes"
  as permissive
  for select
  to authenticated
using ((instructor_id IN ( SELECT instructors.id
   FROM instructors
  WHERE ((auth.uid())::text = (instructors.id)::text))));



  create policy "permit"
  on "public"."classes"
  as permissive
  for select
  to public
using (true);



  create policy "Instructors can manage event participants"
  on "public"."event_participants"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM (events e
     JOIN classes c ON ((e.class_id = c.id)))
  WHERE ((e.id = event_participants.event_id) AND (c.instructor_id = auth.uid())))));



  create policy "Users can view event participants they have access to"
  on "public"."event_participants"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (events e
     JOIN classes c ON ((e.class_id = c.id)))
  WHERE ((e.id = event_participants.event_id) AND ((c.instructor_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM class_players cp
          WHERE ((cp.class_id = c.id) AND (cp.player_id IN ( SELECT p.id
                   FROM players p
                  WHERE (p.email = auth.email())))))))))));



  create policy "Instructors can insert own events"
  on "public"."events"
  as permissive
  for insert
  to authenticated
with check ((instructor_id IN ( SELECT instructors.id
   FROM instructors
  WHERE ((auth.uid())::text = (instructors.id)::text))));



  create policy "Instructors can read own events"
  on "public"."events"
  as permissive
  for select
  to authenticated
using ((instructor_id IN ( SELECT instructors.id
   FROM instructors
  WHERE ((auth.uid())::text = (instructors.id)::text))));



  create policy "Instructors can update own events"
  on "public"."events"
  as permissive
  for update
  to authenticated
using ((instructor_id IN ( SELECT instructors.id
   FROM instructors
  WHERE ((auth.uid())::text = (instructors.id)::text))));



  create policy "permit all"
  on "public"."events"
  as permissive
  for all
  to public
using (true);



  create policy "permit"
  on "public"."events"
  as permissive
  for select
  to public
using (true);



  create policy "Allow read access to influencers"
  on "public"."influencers"
  as permissive
  for select
  to authenticated
using (true);



  create policy "true"
  on "public"."influencers"
  as permissive
  for all
  to public
using (true);



  create policy "Instructors can update own stats"
  on "public"."instructor_stats"
  as permissive
  for all
  to public
using (((auth.uid())::text = (instructor_id)::text));



  create policy "Instructors can view own stats"
  on "public"."instructor_stats"
  as permissive
  for select
  to public
using (((auth.uid())::text = (instructor_id)::text));



  create policy "Allow authenticated users to create instructor profile"
  on "public"."instructors"
  as permissive
  for insert
  to authenticated
with check (((auth.uid())::text = (id)::text));



  create policy "Instructors can read own data"
  on "public"."instructors"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Instructors can update own data"
  on "public"."instructors"
  as permissive
  for update
  to authenticated
using (((auth.uid())::text = (id)::text));



  create policy "permit all"
  on "public"."instructors"
  as permissive
  for all
  to public
using (true);



  create policy "instructor_can_view_match_results"
  on "public"."match_results"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (events e
     JOIN classes c ON ((e.class_id = c.id)))
  WHERE ((e.id = match_results.event_id) AND (c.instructor_id = auth.uid())))));



  create policy "service_role_can_insert_match_results"
  on "public"."match_results"
  as permissive
  for insert
  to public
with check (true);



  create policy "permit"
  on "public"."matches"
  as permissive
  for all
  to public
using (true);



  create policy "permit"
  on "public"."players"
  as permissive
  for all
  to public
using (true);



  create policy "Instructors can delete their teams"
  on "public"."teams"
  as permissive
  for delete
  to authenticated
using ((class_id IN ( SELECT c.id
   FROM (classes c
     JOIN instructors i ON ((c.instructor_id = i.id)))
  WHERE ((auth.uid())::text = (i.id)::text))));



  create policy "Instructors can insert their teams"
  on "public"."teams"
  as permissive
  for insert
  to authenticated
with check (((class_id IN ( SELECT c.id
   FROM (classes c
     JOIN instructors i ON ((c.instructor_id = i.id)))
  WHERE ((auth.uid())::text = (i.id)::text))) AND (created_by = auth.uid())));



  create policy "Instructors can read their teams"
  on "public"."teams"
  as permissive
  for select
  to authenticated
using ((class_id IN ( SELECT c.id
   FROM (classes c
     JOIN instructors i ON ((c.instructor_id = i.id)))
  WHERE ((auth.uid())::text = (i.id)::text))));



  create policy "Instructors can update their teams"
  on "public"."teams"
  as permissive
  for update
  to authenticated
using ((class_id IN ( SELECT c.id
   FROM (classes c
     JOIN instructors i ON ((c.instructor_id = i.id)))
  WHERE ((auth.uid())::text = (i.id)::text))));



  create policy "Public can manage teams"
  on "public"."teams"
  as permissive
  for all
  to public
using (true);



  create policy "Public can read teams"
  on "public"."teams"
  as permissive
  for select
  to public
using (true);


CREATE TRIGGER trigger_class_players_stats AFTER INSERT OR DELETE OR UPDATE ON public.class_players FOR EACH ROW EXECUTE FUNCTION handle_class_players_changes();

CREATE TRIGGER trigger_classes_stats AFTER INSERT OR DELETE OR UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION handle_direct_instructor_changes();

CREATE TRIGGER on_new_match_result_update_count AFTER INSERT ON public.match_results FOR EACH ROW EXECUTE FUNCTION update_player_match_count();

CREATE TRIGGER trigger_match_results_stats AFTER INSERT OR DELETE OR UPDATE ON public.match_results FOR EACH ROW EXECUTE FUNCTION handle_related_table_changes();

CREATE TRIGGER trigger_update_event_participation_status AFTER INSERT ON public.match_results FOR EACH ROW EXECUTE FUNCTION update_event_participation_status();


