package com.easyworship.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PresentationMessage {
    private String type; // SLIDE, BLACK, CLEAR, LOGO
    private String title;
    private String content;
    private int slideIndex;
    private int totalSlides;
}
