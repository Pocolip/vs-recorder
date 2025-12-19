package com.yeskatronics.vs_recorder_backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI/Swagger configuration for API documentation.
 * Accessible at: http://localhost:8080/swagger-ui.html
 */
@Configuration
public class OpenAPIConfig {

    @Value("${server.port:8080}")
    private String serverPort;

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("VS Recorder API")
                        .version("1.0.0")
                        .description("""
                                VS Recorder backend API for managing Pokemon VGC teams, replays, and match analysis.
                                
                                ## Features
                                - JWT-based authentication
                                - Team management with Pokepaste integration
                                - Replay import from Pokemon Showdown
                                - Best-of-3 match tracking
                                - Win rate and statistics calculation
                                
                                ## Authentication
                                Most endpoints require a JWT token. To authenticate:
                                1. Register at POST /api/auth/register
                                2. Login at POST /api/auth/login to get token
                                3. Use the "Authorize" button above and enter: Bearer {your-token}
                                4. All authenticated requests will include the token automatically
                                
                                ## Quick Start
                                1. Register/Login to get JWT token
                                2. Create a team with Pokepaste URL
                                3. Import replays from Pokemon Showdown URLs
                                4. Track matches and view statistics
                                """)
                        .contact(new Contact()
                                .name("VS Recorder")
                                .url("https://github.com/your-repo/vs-recorder"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:" + serverPort)
                                .description("Local Development Server")))
                .addSecurityItem(new SecurityRequirement()
                        .addList("bearerAuth"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth",
                                new SecurityScheme()
                                        .name("bearerAuth")
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("JWT token authentication. Use the 'Authorize' button to enter your token.")));
    }
}