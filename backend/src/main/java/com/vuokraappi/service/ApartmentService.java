package com.vuokraappi.service;

import com.vuokraappi.dto.ApartmentRequest;
import com.vuokraappi.dto.ApartmentResponse;
import com.vuokraappi.dto.ApartmentSearchCriteria;
import com.vuokraappi.entity.Apartment;
import com.vuokraappi.entity.Landlord;
import com.vuokraappi.entity.User;
import com.vuokraappi.exception.ResourceNotFoundException;
import com.vuokraappi.exception.UnauthorizedException;
import com.vuokraappi.exception.UserNotFoundException;
import com.vuokraappi.repository.ApartmentRepository;
import com.vuokraappi.repository.ApartmentSpecification;
import com.vuokraappi.repository.LandlordRepository;
import com.vuokraappi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApartmentService {
    
    private final ApartmentRepository apartmentRepository;
    private final LandlordRepository landlordRepository;
    private final UserRepository userRepository;
    
    @Transactional(readOnly = true)
    public List<ApartmentResponse> getApartmentsByUserId(UUID userId) {
        // Tarkista ettÃ¤ kÃ¤yttÃ¤jÃ¤ on olemassa
        userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(
                String.format("User with ID %s not found", userId)
            ));

        // Hae landlord - jos ei ole landlord, palautetaan tyhjÃ¤ lista
        return landlordRepository.findById(userId)
            .map(landlord -> apartmentRepository.findByOwner(landlord).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList()))
            .orElse(Collections.emptyList());
    }

    @Transactional(readOnly = true)
    public List<ApartmentResponse> getAllApartments() {
        return apartmentRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Hakee asuntoja annettujen kriteerien perusteella.
     * Kaikki kriteerit ovat optionaalisia - tyhjä criteria palauttaa kaikki asunnot.
     */
    @Transactional(readOnly = true)
    public List<ApartmentResponse> searchApartments(ApartmentSearchCriteria criteria) {
        log.info("Searching apartments with criteria: {}", criteria);
        
        List<Apartment> apartments = apartmentRepository.findAll(
            ApartmentSpecification.withCriteria(criteria)
        );
        
        log.info("Found {} apartments matching criteria", apartments.size());
        
        return apartments.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public ApartmentResponse getApartmentById(UUID id) {
        Apartment apartment = apartmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Apartment not found with id: " + id));
        return convertToDTO(apartment);
    }
    
    @Transactional
    public ApartmentResponse createApartment(ApartmentRequest requestDTO, User currentUser) {
        // Verify user is a landlord - koska id on jaettu, voidaan hakea suoraan
        Landlord landlord = landlordRepository.findById(currentUser.getId())
                .orElseThrow(() -> new UnauthorizedException("Only landlords can create apartments"));
    
        Apartment apartment = new Apartment();
        apartment.setOwner(landlord);
        apartment.setZipcode(requestDTO.getZipcode());
        apartment.setStreetAddress(requestDTO.getStreetAddress());
        apartment.setCity(requestDTO.getCity());
        apartment.setRegion(requestDTO.getRegion());
        apartment.setSize(requestDTO.getSize());
        apartment.setLongitude(requestDTO.getLongitude());
        apartment.setLatitude(requestDTO.getLatitude());
        apartment.setRent(requestDTO.getRent());
    
        Apartment savedApartment = apartmentRepository.save(apartment);
        return convertToDTO(savedApartment);
    }

    @Transactional
    public ApartmentResponse updateApartment(UUID id, ApartmentRequest requestDTO, User currentUser) {
        Apartment apartment = apartmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Apartment not found with id: " + id));

        // Verify ownership
        if (!apartment.getOwner().getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You can only update your own apartments");
        }

        // PÃ¤ivitetÃ¤Ã¤n vain ne kentÃ¤t jotka on lÃ¤hetetty (ei null)
        if (requestDTO.getZipcode() != null) apartment.setZipcode(requestDTO.getZipcode());
        if (requestDTO.getStreetAddress() != null) apartment.setStreetAddress(requestDTO.getStreetAddress());
        if (requestDTO.getCity() != null) apartment.setCity(requestDTO.getCity());
        if (requestDTO.getRegion() != null) apartment.setRegion(requestDTO.getRegion());
        if (requestDTO.getSize() != null) apartment.setSize(requestDTO.getSize());
        if (requestDTO.getLongitude() != null) apartment.setLongitude(requestDTO.getLongitude());
        if (requestDTO.getLatitude() != null) apartment.setLatitude(requestDTO.getLatitude());
        if (requestDTO.getRent() != null) apartment.setRent(requestDTO.getRent());

        Apartment updatedApartment = apartmentRepository.save(apartment);
        return convertToDTO(updatedApartment);
    }
    
    @Transactional
    public void deleteApartment(UUID id, User currentUser) {
        Apartment apartment = apartmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Apartment not found with id: " + id));
        
        // Verify ownership (unless admin)
        if (!currentUser.getRole().equals("ADMIN") && 
            !apartment.getOwner().getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You can only delete your own apartments");
        }
        
        apartmentRepository.delete(apartment);
    }
    
    private ApartmentResponse convertToDTO(Apartment apartment) {
        ApartmentResponse dto = new ApartmentResponse();
        dto.setId(apartment.getId());
        dto.setOwnerId(apartment.getOwner().getId());
    
        User owner = apartment.getOwner().getUser();
        String firstName = owner.getFirstName() != null ? owner.getFirstName() : "";
        String lastName = owner.getLastName() != null ? owner.getLastName() : "";
        dto.setOwnerName((firstName + " " + lastName).trim());
    
        dto.setZipcode(apartment.getZipcode());
        dto.setStreetAddress(apartment.getStreetAddress());
        dto.setCity(apartment.getCity());
        dto.setRegion(apartment.getRegion());
        dto.setSize(apartment.getSize());
        dto.setLongitude(apartment.getLongitude());
        dto.setLatitude(apartment.getLatitude());
        dto.setRent(apartment.getRent());
        dto.setOwnerIdentityVerified(owner.getIdentityVerified());
        return dto;
    }
}