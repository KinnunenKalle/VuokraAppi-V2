-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    role VARCHAR(20) NOT NULL CHECK (role IN ('TENANT', 'LANDLORD')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    introduction VARCHAR(2000),
    date_of_birth DATE,
    personal_identity_code VARCHAR(25),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create index for active users
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    occupation VARCHAR(100),
    monthly_income INTEGER,
    current_address VARCHAR(255),
    pet VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create landlords table
CREATE TABLE IF NOT EXISTS landlords (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(200),
    business_id VARCHAR(50),
    bank_account VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS apartments (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id     UUID         NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
    zipcode      VARCHAR(20)  NOT NULL,
    street_address VARCHAR(255) NOT NULL,
    city         VARCHAR(100) NOT NULL,
    region       VARCHAR(100) NOT NULL,
    size         DOUBLE PRECISION NOT NULL,
    longitude    DOUBLE PRECISION NOT NULL,
    latitude     DOUBLE PRECISION NOT NULL,
    rent         DECIMAL(10,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_apartments_owner_id ON apartments(owner_id);

CREATE TABLE IF NOT EXISTS apartment_images (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    apartment_id UUID        NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    blob_name    VARCHAR(500) NOT NULL,
    filename     VARCHAR(255),
    content_type VARCHAR(100),
    file_size    BIGINT,
    sort_order   INT         NOT NULL DEFAULT 0,
    is_primary   BOOLEAN     NOT NULL DEFAULT FALSE,
    uploaded_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Indeksi apartment_id:lle – lähes kaikki kyselyt hakevat tietyn asunnon kuvat
CREATE INDEX IF NOT EXISTS idx_apartment_images_apartment_id
    ON apartment_images(apartment_id);

-- Varmistetaan että sort_order on nouseva tietyn asunnon sisällä
CREATE INDEX IF NOT EXISTS idx_apartment_images_apartment_sort
    ON apartment_images(apartment_id, sort_order);

-- Constraint: maksimissaan yksi primary-kuva per asunto
-- (Huom: tämä on partial unique index – toimii PostgreSQL:ssä)
CREATE UNIQUE INDEX IF NOT EXISTS idx_apartment_images_one_primary
    ON apartment_images(apartment_id)
    WHERE is_primary = TRUE;

-- Vahva tunnistautuminen: poistetaan hetu users-taulusta jos se on olemassa
ALTER TABLE users DROP COLUMN IF EXISTS personal_identity_code;

-- Vahva tunnistautuminen: lisätään tilatiedot users-tauluun
ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMP;

-- Vahva tunnistautuminen: erillinen taulu hetulle
-- id = HMAC(userId, IDENTITY_LOOKUP_SECRET) → ei suoraa FK:ta users-tauluun
-- encrypted_hetu = AES-256-GCM salattu hetu
CREATE TABLE IF NOT EXISTS identity_verifications (
    id UUID PRIMARY KEY,
    encrypted_hetu TEXT NOT NULL
);