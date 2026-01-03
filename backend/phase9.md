# Phase 9: CORS & Production Configuration

## ✅ Completed

### 1. CORS Configuration

**File:** `CorsConfig.java`

**Allowed Origins:**
- `http://localhost:3000` - React dev server
- `http://localhost:5173` - Vite dev server
- `http://localhost:8080` - Alternative frontend port
- `https://replay.pokemonshowdown.com` - Pokemon Showdown replays
- `https://pokepast.es` - Pokepaste service
- `https://pokebin.com` - Pokebin service

**Configuration:**
- ✅ All HTTP methods allowed (GET, POST, PUT, PATCH, DELETE, OPTIONS)
- ✅ All headers allowed
- ✅ Credentials enabled (cookies, auth headers)
- ✅ Authorization header exposed to frontend
- ✅ Preflight cache: 1 hour

### 2. Security Integration

**File:** `SecurityConfig.java`

**Updates:**
- ✅ Added CORS configuration source injection
- ✅ Applied CORS to security filter chain
- ✅ CORS enabled before authentication

### 3. Application Configuration

**Files:**
- `application.properties` - Development config
- `application-prod.properties` - Production config

**Development Settings:**
- H2 database (file-based persistence)
- SQL logging enabled
- H2 console enabled
- File uploads up to 10MB
- DevTools enabled

**Production Settings:**
- PostgreSQL database (environment variables)
- SQL logging disabled
- H2 console disabled
- Secure cookies
- Connection pooling optimized
- File logging with rotation
- Health checks and metrics

---

## 🚀 Usage

### Development Mode

```bash
# Run with default (development) profile
./mvnw spring-boot:run
```

### Production Mode

```bash
# Set environment variables
export JWT_SECRET=your-super-secure-production-secret-key
export DATABASE_URL=jdbc:postgresql://your-db-host:5432/vsrecorder
export DB_USERNAME=vsrecorder_user
export DB_PASSWORD=your-db-password

# Run with production profile
./mvnw spring-boot:run -Dspring-boot.run.profiles=prod
```

Or with a JAR:

```bash
java -jar -Dspring.profiles.active=prod target/vs-recorder-backend.jar
```

---

## 🔧 Frontend Integration

### Making API Requests

The backend now accepts requests from your frontend. Example using fetch:

```javascript
// Login example
const response = await fetch('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Include cookies
  body: JSON.stringify({
    username: 'testuser',
    password: 'password123'
  })
});

const data = await response.json();
const token = data.token;

// Authenticated request example
const teams = await fetch('http://localhost:8080/api/teams', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  credentials: 'include'
});
```

### Axios Configuration

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

## 🔒 Security Notes

### JWT Secret

**CRITICAL:** Change the JWT secret in production!

```properties
# Development (application.properties)
jwt.secret=your-very-secure-secret-key-change-this-in-production-minimum-256-bits-required

# Production (environment variable)
JWT_SECRET=use-a-cryptographically-secure-random-string-at-least-256-bits
```

Generate a secure secret:

```bash
# Linux/Mac
openssl rand -base64 32

# Or use online generator: https://www.random.org/strings/
```

### CORS Origins

**Update for production:** Replace localhost URLs with your actual frontend domain:

```java
configuration.setAllowedOrigins(Arrays.asList(
    "https://your-frontend-domain.com",
    "https://replay.pokemonshowdown.com",
    "https://pokepast.es",
    "https://pokebin.com"
));
```

---

## 📦 Database Migration

### From H2 to PostgreSQL

**1. Install PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql
```

**2. Create Database:**
```sql
CREATE DATABASE vsrecorder;
CREATE USER vsrecorder_user WITH ENCRYPTED PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE vsrecorder TO vsrecorder_user;
```

**3. Add PostgreSQL Dependency:**

Add to `pom.xml`:
```xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

**4. Update Configuration:**

Set environment variables or update `application-prod.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/vsrecorder
spring.datasource.username=vsrecorder_user
spring.datasource.password=your-password
```

**5. Run with Production Profile:**
```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=prod
```

---

## 🎯 Next Steps

1. **Frontend Development** - Start building React/Vue frontend
2. **Testing** - Test CORS with actual frontend requests
3. **Deployment** - Deploy to cloud (Heroku, AWS, Railway, etc.)
4. **Monitoring** - Set up logging and health check monitoring
5. **Documentation** - API documentation via Swagger UI

---

## 📚 Available Endpoints

With CORS configured, your frontend can now access:

**Authentication:**
- POST `/api/auth/register`
- POST `/api/auth/login`

**Users:**
- GET `/api/users/me`
- PUT `/api/users/me`
- GET `/api/users/check/username/{username}`
- GET `/api/users/check/email/{email}`

**Teams:**
- GET/POST `/api/teams`
- GET/PUT/DELETE `/api/teams/{id}`
- POST `/api/teams/from-pokepaste`

**Replays:**
- GET/POST `/api/teams/{teamId}/replays`
- GET/PUT/DELETE `/api/replays/{id}`
- POST `/api/teams/{teamId}/replays/from-url`

**Matches:**
- GET/POST `/api/matches`
- GET/PUT/DELETE `/api/matches/{id}`
- GET `/api/matches/{id}/opponent-team`

**Analytics:**
- GET `/api/teams/{id}/stats/usage`
- GET `/api/teams/{id}/stats/matchups`
- POST `/api/teams/{id}/stats/matchups/custom`
- GET `/api/teams/{id}/stats/moves`

**Game Plans:**
- GET/POST `/api/game-plans`
- GET/PUT/DELETE `/api/game-plans/{id}`
- POST `/api/game-plans/{id}/teams`
- POST `/api/game-plans/{id}/teams/{teamId}/compositions`

**Documentation:**
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI Spec: `http://localhost:8080/v3/api-docs`

---

## ✅ Phase 9 Complete!

Your backend is now ready for:
- ✅ Frontend integration with CORS
- ✅ Production deployment
- ✅ PostgreSQL migration
- ✅ Secure API access

Ready to build the frontend! 🎉