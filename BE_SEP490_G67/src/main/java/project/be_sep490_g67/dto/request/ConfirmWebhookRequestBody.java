package project.be_sep490_g67.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ConfirmWebhookRequestBody {
    private String webhookUrl;

    public ConfirmWebhookRequestBody(String webhookUrl) {
        this.webhookUrl = webhookUrl;
    }
}
