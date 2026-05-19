package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.be_sep490_g67.entity.User;

public interface UserRepository extends JpaRepository<User,Integer> {

}
