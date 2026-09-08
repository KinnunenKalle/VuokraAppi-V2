package com.vuokraappi.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.vuokraappi.entity.ApartmentImage;
import com.vuokraappi.entity.Landlord;

@Entity
@Table(name = "apartments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Apartment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    @NotNull(message = "Owner is required")
    private Landlord owner;
    
    @NotBlank(message = "Zip code is required")
    @Column(nullable = false)
    private String zipcode;
    
    @NotBlank(message = "Street address is required")
    @Column(nullable = false)
    private String streetAddress;
    
    @NotBlank(message = "City is required")
    @Column(nullable = false)
    private String city;
    
    @NotBlank(message = "Region is required")
    @Column(nullable = false)
    private String region;
    
    @NotNull(message = "Size is required")
    @Column(nullable = false)
    private Double size;
    
    @NotNull(message = "Longitude is required")
    @Column(nullable = false)
    private Double longitude;
    
    @NotNull(message = "Latitude is required")
    @Column(nullable = false)
    private Double latitude;
    
    @NotNull(message = "Rent is required")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal rent;

    @OneToMany(mappedBy = "apartment", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @ToString.Exclude
    private List<ApartmentImage> images = new ArrayList<>();
}