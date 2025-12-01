package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.entities.BasicEntity;
import com.yeskatronics.vs_recorder_backend.services.BasicService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloWorldController {

    private BasicService service;

    public HelloWorldController(@Autowired BasicService service){
        this.service = service;
    }

    @GetMapping(path = "/entity", produces = "application/json")
    public BasicEntity getEntity(){
        return service.getEntity();
    }
}
