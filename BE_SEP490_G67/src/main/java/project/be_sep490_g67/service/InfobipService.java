package project.be_sep490_g67.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import project.be_sep490_g67.dto.request.infobipRequest.*;
import java.io.IOException;
import java.util.Collections;

@Slf4j
@Service
public class InfobipService {

    @Value("${infobip.api.key}")
    private String apiKey;

    @Value("${infobip.base.url}")
    private String baseUrl;

    public String sendSms(String phone, String name, String otp) throws IOException {
        OkHttpClient client = new OkHttpClient();
        ObjectMapper mapper = new ObjectMapper();

        // 1. Custom format message
        String customContent = String.format("Chao %s, ma OTP cua ban la: %s. ", name, otp);
        Content content = new Content(customContent);
        // 2. Create object request
        Destination dest = new Destination(phone);
        Message msg = new Message(
                Collections.singletonList(dest),
                "Tap hoa Duc Thang",
                content
        );
        InfobipRequest requestBody = new InfobipRequest(Collections.singletonList(msg));

        // 3. Convert to JSON
        String jsonBody = mapper.writeValueAsString(requestBody);
        log.info("Sending SMS with payload: {}", jsonBody);
        RequestBody body = RequestBody.create(
                jsonBody,
                MediaType.parse("application/json")
        );

        Request request = new Request.Builder()
                .url(baseUrl + "/sms/3/messages")
                .post(body)
                .addHeader("Authorization", "App "+apiKey)
                .addHeader("Content-Type", "application/json")
                .build();

        try (Response response = client.newCall(request).execute()) {
            return response.body().string();
        }
    }
}