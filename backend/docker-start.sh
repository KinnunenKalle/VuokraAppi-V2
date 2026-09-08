#!/bin/bash

# Vuokraappi Backend - Docker Quick Start
# Tämä skripti auttaa pääsemään nopeasti alkuun

set -e

echo "🚀 Vuokraappi Backend - Docker Setup"
echo "===================================="
echo ""

# Tarkista Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker ei ole asennettu!"
    echo "Asenna Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose ei ole asennettu!"
    exit 1
fi

echo "✅ Docker löytyi"
echo ""

# Tarkista .env
if [ ! -f .env ]; then
    echo "📝 Luodaan .env-tiedosto..."
    cp .env.example .env
    echo "✅ .env-tiedosto luotu"
    echo "⚠️  Muokkaa .env-tiedostoa tarvittaessa (Azure AD -asetukset)"
else
    echo "✅ .env-tiedosto löytyi"
fi
echo ""

# Kysy käyttäjältä
echo "Valitse käynnistystapa:"
echo "1) Tuotanto-build (optimoitu, nopea)"
echo "2) Kehitys-build (hot reload, debugging)"
echo ""
read -p "Valinta (1/2): " choice

case $choice in
    1)
        echo ""
        echo "🏗️  Käynnistetään tuotanto-build..."
        echo ""
        docker-compose up --build
        ;;
    2)
        echo ""
        echo "💻 Käynnistetään kehitys-build..."
        echo "Debug-portti: 5005"
        echo ""
        docker-compose -f docker-compose-dev.yml up --build
        ;;
    *)
        echo "❌ Virheellinen valinta"
        exit 1
        ;;
esac
