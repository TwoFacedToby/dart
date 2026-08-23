import { db } from "./db";

// Runs on every boot. All statements are idempotent (CREATE TABLE IF NOT
// EXISTS / addColumnIfNotExists), so this doubles as the only migration
// mechanism the app needs.
export async function createTables(): Promise<void> {
    console.log("Running migrations...");

    const statements = [
        `CREATE TABLE IF NOT EXISTS ids
        (
            id   VARCHAR(32) PRIMARY KEY,
            seq  INT         AUTO_INCREMENT UNIQUE, -- every id gets one, in true creation order, regardless of entity type
            type VARCHAR(32)
            )`,

        `CREATE TABLE IF NOT EXISTS players
        (
            id                   VARCHAR(32) PRIMARY KEY,
            name                 VARCHAR(64) UNIQUE NOT NULL,
            initials             VARCHAR(8)  UNIQUE NOT NULL,
            atw_win_streak      INT      DEFAULT 0,
            atw_best_win_streak INT      DEFAULT 0,
            created_at           DATETIME DEFAULT NOW(),
            updated_at           DATETIME DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (id) REFERENCES ids (id)
            )`,

        // ---- Around the World ----
        `CREATE TABLE IF NOT EXISTS atw_games
        (
            id             VARCHAR(32) PRIMARY KEY,
            status         VARCHAR(16) DEFAULT 'active', -- active | finale | finished  (mirrors phase, kept for quick filtering)
            phase          VARCHAR(16) DEFAULT 'normal', -- normal | ending | finale | finished
            turn_queue     TEXT        DEFAULT NULL,     -- JSON array of participant_id, front = current turn
            turn_index     INT         DEFAULT 0,        -- increments each time a new turn starts
            turn_dart_count INT        DEFAULT 0,
            turn_all_hit   BOOLEAN     DEFAULT TRUE,
            turn_in_bonus  BOOLEAN     DEFAULT FALSE,
            turn_catchup   BOOLEAN     DEFAULT FALSE,     -- locked in at first dart of the current turn
            finishers_json TEXT        DEFAULT NULL,      -- JSON array of participant_id who finished in the ending round
            start_streaks_json TEXT    DEFAULT NULL,      -- snapshot of every player's win streak at game creation, so undo can restore it exactly
            winner_id      VARCHAR(32) DEFAULT NULL,
            created_at     DATETIME    DEFAULT NOW(),
            finished_at    DATETIME    DEFAULT NULL,
            FOREIGN KEY (id) REFERENCES ids (id),
            FOREIGN KEY (winner_id) REFERENCES players (id)
            )`,

        `CREATE TABLE IF NOT EXISTS atw_participants
        (
            id              VARCHAR(32) PRIMARY KEY,
            game_id         VARCHAR(32) NOT NULL,
            player_id       VARCHAR(32) NOT NULL,
            turn_order      INT         NOT NULL,
            current_number  INT         DEFAULT 1,
            finished        BOOLEAN     DEFAULT FALSE,
            finish_order    INT         DEFAULT NULL,     -- sequence in which they crossed 20, not final game rank
            joined_mid_game BOOLEAN     DEFAULT FALSE,
            catching_up     BOOLEAN     DEFAULT FALSE,
            catchup_target  INT         DEFAULT NULL,
            created_at      DATETIME    DEFAULT NOW(),
            FOREIGN KEY (id) REFERENCES ids (id),
            FOREIGN KEY (game_id) REFERENCES atw_games (id),
            FOREIGN KEY (player_id) REFERENCES players (id)
            )`,

        `CREATE TABLE IF NOT EXISTS atw_throws
        (
            id              VARCHAR(32) PRIMARY KEY,
            seq             INT         AUTO_INCREMENT UNIQUE, -- reliable chronological order, DATETIME alone isn't precise enough
            game_id         VARCHAR(32) NOT NULL,
            participant_id  VARCHAR(32) NOT NULL,
            player_id       VARCHAR(32) NOT NULL,
            turn_index      INT         NOT NULL,
            dart_index      INT         NOT NULL,
            target_number   INT         NOT NULL,
            result          VARCHAR(8)  NOT NULL, -- miss | single | double | triple
            catchup_active  BOOLEAN     DEFAULT FALSE,
            advancement     INT         DEFAULT 0,
            created_at      DATETIME    DEFAULT NOW(),
            FOREIGN KEY (id) REFERENCES ids (id),
            FOREIGN KEY (game_id) REFERENCES atw_games (id),
            FOREIGN KEY (participant_id) REFERENCES atw_participants (id),
            FOREIGN KEY (player_id) REFERENCES players (id)
            )`,

        `CREATE TABLE IF NOT EXISTS atw_finale_scores
        (
            id         VARCHAR(32) PRIMARY KEY,
            seq        INT         AUTO_INCREMENT UNIQUE,
            game_id    VARCHAR(32) NOT NULL,
            player_id  VARCHAR(32) NOT NULL,
            round      INT         NOT NULL,
            score      INT         NOT NULL,
            created_at DATETIME    DEFAULT NOW(),
            FOREIGN KEY (id) REFERENCES ids (id),
            FOREIGN KEY (game_id) REFERENCES atw_games (id),
            FOREIGN KEY (player_id) REFERENCES players (id)
            )`,

        // ---- Cricket ----
        `CREATE TABLE IF NOT EXISTS cricket_games
        (
            id               VARCHAR(32) PRIMARY KEY,
            status           VARCHAR(16) DEFAULT 'active', -- active | finished
            current_turn_order INT      DEFAULT 0,          -- turn_order of whoever is up
            turn_dart_count  INT         DEFAULT 0,
            turn_index       INT         DEFAULT 0,
            winner_id        VARCHAR(32) DEFAULT NULL,
            created_at       DATETIME    DEFAULT NOW(),
            finished_at      DATETIME    DEFAULT NULL,
            FOREIGN KEY (id) REFERENCES ids (id),
            FOREIGN KEY (winner_id) REFERENCES players (id)
            )`,

        `CREATE TABLE IF NOT EXISTS cricket_participants
        (
            id          VARCHAR(32) PRIMARY KEY,
            game_id     VARCHAR(32) NOT NULL,
            player_id   VARCHAR(32) NOT NULL,
            turn_order  INT         NOT NULL,
            score       INT         DEFAULT 0,
            marks_15    INT         DEFAULT 0,
            marks_16    INT         DEFAULT 0,
            marks_17    INT         DEFAULT 0,
            marks_18    INT         DEFAULT 0,
            marks_19    INT         DEFAULT 0,
            marks_20    INT         DEFAULT 0,
            marks_bull  INT         DEFAULT 0,
            finished    BOOLEAN     DEFAULT FALSE,
            created_at  DATETIME    DEFAULT NOW(),
            FOREIGN KEY (id) REFERENCES ids (id),
            FOREIGN KEY (game_id) REFERENCES cricket_games (id),
            FOREIGN KEY (player_id) REFERENCES players (id)
            )`,

        `CREATE TABLE IF NOT EXISTS cricket_throws
        (
            id             VARCHAR(32) PRIMARY KEY,
            seq            INT         AUTO_INCREMENT UNIQUE,
            game_id        VARCHAR(32) NOT NULL,
            participant_id VARCHAR(32) NOT NULL,
            player_id      VARCHAR(32) NOT NULL,
            turn_index     INT         NOT NULL,
            dart_index     INT         NOT NULL,
            target         VARCHAR(8)  NOT NULL, -- 15|16|17|18|19|20|bull
            hit_type       VARCHAR(8)  NOT NULL, -- miss|single|double|triple|ring|eye
            marks_scored   INT         DEFAULT 0,
            points_scored  INT         DEFAULT 0,
            created_at     DATETIME    DEFAULT NOW(),
            FOREIGN KEY (id) REFERENCES ids (id),
            FOREIGN KEY (game_id) REFERENCES cricket_games (id),
            FOREIGN KEY (participant_id) REFERENCES cricket_participants (id),
            FOREIGN KEY (player_id) REFERENCES players (id)
            )`,

        // ---- X01 (101 / 301 / 501) ----
        `CREATE TABLE IF NOT EXISTS x01_games
        (
            id                  VARCHAR(32) PRIMARY KEY,
            starting_score      INT         NOT NULL,
            status              VARCHAR(16) DEFAULT 'active', -- active | finished
            current_turn_order  INT         DEFAULT 0,
            turn_index          INT         DEFAULT 0,
            winner_id           VARCHAR(32) DEFAULT NULL,
            created_at          DATETIME    DEFAULT NOW(),
            finished_at         DATETIME    DEFAULT NULL,
            FOREIGN KEY (id) REFERENCES ids (id),
            FOREIGN KEY (winner_id) REFERENCES players (id)
            )`,

        `CREATE TABLE IF NOT EXISTS x01_participants
        (
            id               VARCHAR(32) PRIMARY KEY,
            game_id          VARCHAR(32) NOT NULL,
            player_id        VARCHAR(32) NOT NULL,
            turn_order       INT         NOT NULL,
            remaining_score  INT         NOT NULL,
            finished         BOOLEAN     DEFAULT FALSE,
            created_at       DATETIME    DEFAULT NOW(),
            FOREIGN KEY (id) REFERENCES ids (id),
            FOREIGN KEY (game_id) REFERENCES x01_games (id),
            FOREIGN KEY (player_id) REFERENCES players (id)
            )`,

        `CREATE TABLE IF NOT EXISTS x01_turns
        (
            id              VARCHAR(32) PRIMARY KEY,
            seq             INT         AUTO_INCREMENT UNIQUE,
            game_id         VARCHAR(32) NOT NULL,
            participant_id  VARCHAR(32) NOT NULL,
            player_id       VARCHAR(32) NOT NULL,
            turn_index      INT         NOT NULL,
            score_entered   INT         NOT NULL,
            busted          BOOLEAN     DEFAULT FALSE,
            remaining_after INT         NOT NULL,
            created_at      DATETIME    DEFAULT NOW(),
            FOREIGN KEY (id) REFERENCES ids (id),
            FOREIGN KEY (game_id) REFERENCES x01_games (id),
            FOREIGN KEY (participant_id) REFERENCES x01_participants (id),
            FOREIGN KEY (player_id) REFERENCES players (id)
            )`,
    ];

    for (const sql of statements) {
        await db.query(sql);
    }

    console.log("Migrations complete.");
}