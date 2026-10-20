import React from 'react';

export function StructuredData({ data }) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function GymStructuredData({ settings }) {
  if (!settings) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "ExerciseGym",
    "name": settings.gym_name || "Box de Entrenamiento",
    "description": `${settings.gym_name || "Box de Entrenamiento"} - CrossFit y entrenamiento funcional`,
  };

  if (settings.address) {
    data.address = {
      "@type": "PostalAddress",
      "streetAddress": settings.address
    };
  }

  if (settings.phone) {
    data.telephone = settings.phone;
  }

  if (settings.contact_email) {
    data.email = settings.contact_email;
  }

  const sameAs = [];
  if (settings.facebook) sameAs.push(settings.facebook);
  if (settings.instagram) sameAs.push(settings.instagram);
  if (settings.twitter) sameAs.push(settings.twitter);
  if (settings.youtube) sameAs.push(settings.youtube);

  if (sameAs.length > 0) {
    data.sameAs = sameAs;
  }

  if (settings.gym_hours) {
    data.openingHours = settings.gym_hours
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.trim());
  }

  if (settings.logo) {
    data.logo = settings.logo;
    data.image = settings.logo;
  }

  const currentUrl = window.location.origin;
  data.url = currentUrl;

  return <StructuredData data={data} />;
}

export default StructuredData;
