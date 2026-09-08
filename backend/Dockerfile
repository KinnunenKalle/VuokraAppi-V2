# Monivaiheinen build - pienentää lopullista imagea
FROM maven:3.9-eclipse-temurin-17 AS build

# Aseta työhakemisto
WORKDIR /app

# Kopioi pom.xml ja lataa riippuvuudet (cache-optimointi)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Kopioi lähdekoodi
COPY src ./src

# Buildaa sovellus
RUN mvn clean package -DskipTests

# Runtime-vaihe - kevyempi image
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Luo käyttäjä turvallisuussyistä (ei root)
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Kopioi valmis JAR build-vaiheesta
COPY --from=build /app/target/*.jar app.jar

# Avaa portti
EXPOSE 8080

# Käynnistyskomento
ENTRYPOINT ["java", "-jar", "app.jar"]
