package com.easyworship.controller;

import com.easyworship.model.PresentationMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class PresentationController {

    @MessageMapping("/live")
    @SendTo("/topic/live")
    public PresentationMessage broadcast(PresentationMessage message) {
        return message;
    }
}
