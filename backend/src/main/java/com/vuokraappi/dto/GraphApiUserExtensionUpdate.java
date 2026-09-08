package com.vuokraappi.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GraphApiUserExtensionUpdate {
    
    // Azure AD:ssä extension attributet tallennetaan avain-arvo pareina
    // Esim: "extension_<appId>_role": "TENANT"
    @JsonProperty("extensionAttributes")
    private Map<String, String> extensionAttributes = new HashMap<>();
    
    public void addExtensionAttribute(String key, String value) {
        this.extensionAttributes.put(key, value);
    }
}
