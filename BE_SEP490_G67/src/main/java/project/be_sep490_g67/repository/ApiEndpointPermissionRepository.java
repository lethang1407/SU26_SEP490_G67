package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ApiEndpointPermission;

import java.util.List;

@Repository
public interface ApiEndpointPermissionRepository extends JpaRepository<ApiEndpointPermission, Integer> {

    List<ApiEndpointPermission> findByIsActiveTrue();

    List<ApiEndpointPermission> findByPermissionCode(String permissionCode);
}
