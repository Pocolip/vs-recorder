package com.yeskatronics.vs_recorder_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class VsRecorderBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(VsRecorderBackendApplication.class, args);
	}

}
