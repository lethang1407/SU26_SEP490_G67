package project.be_sep490_g67.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

public class infobipRequest {


    @Data
    @AllArgsConstructor
    public static class InfobipRequest {
        private List<Message> messages;
    }

    @Data
    @AllArgsConstructor
    public static class Message {
        private List<Destination> destinations;
        private String from; // Sender
        private Content content; // CHỖ NÀY PHẢI LÀ OBJECT
    }

    @Data
    @AllArgsConstructor
    public static class Destination {
        private String to;
    }
    @Data @AllArgsConstructor
    public static class Content {
        private String text; // Nội dung tin nhắn nằm ở đây
    }

}
