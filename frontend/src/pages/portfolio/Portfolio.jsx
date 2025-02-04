import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import './Portfolio.css';

const Portfolio = () => {
  return (
    <div className="portfolio-container">
      {/* Hero Section */}
      <section className="hero-section">
        <h1>Akeem</h1>
        <p>Full Stack Developer | Designer | Creative Thinker</p>
      </section>

      {/* About Section */}
      <section className="about-section">
        <Container>
          <h2>About Me</h2>
          <p>
            [I am the strongest of em all.]
          </p>
        </Container>
      </section>

      {/* Skills Section */}
      <section className="skills-section">
        <Container>
          <h2>Skills</h2>
          <div className="skills-grid">
            <div className="skill-item">Frontend Development</div>
            <div className="skill-item">Backend Development</div>
            <div className="skill-item">UI/UX Design</div>
            <div className="skill-item">Database Management</div>
          </div>
        </Container>
      </section>

      {/* Projects Section */}
      <section className="projects-section">
        <Container>
          <h2>Projects</h2>
          <Row>
            {[1, 2, 3].map((project) => (
              <Col key={project} md={4} className="mb-4">
                <div className="project-card">
                  <div className="project-image">
                    [Project Image Placeholder]
                  </div>
                  <h3>Project Title {project}</h3>
                  <p>This project.</p>
                  <button className="view-project-btn">View Project</button>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <Container>
          <h2>Get In Touch</h2>
          <div className="contact-info">
            <p>Email: joko@gmail.com</p>
            <p>LinkedIn: ajoko</p>
            <p>GitHub: keemo</p>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default Portfolio;
