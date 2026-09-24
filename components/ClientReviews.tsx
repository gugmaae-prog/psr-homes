const reviews = [
  { name: "Acquisition brief", quote: "Budget, timing, property type and investment objective are clarified before recommendations begin." },
  { name: "Market comparison", quote: "Projects are reviewed through location, developer record, payment structure, resale logic and current availability." },
  { name: "Owner representation", quote: "Pricing, presentation, lead qualification and negotiation are handled as one managed process." },
  { name: "Client communication", quote: "Shortlists, next steps and risks are explained in plain language so decisions stay calm and documented." },
];

const PSR_HOME = "/";

export function ClientReviews({ compact = false }: { compact?: boolean }) {
  return <section className={`client-reviews section-pad${compact ? " compact" : ""}`}>
    <div className="client-reviews-heading">
      <div><p className="kicker">Client experience</p><h2>Service remembered<br /><em>for the right reasons.</em></h2></div>
      <div className="review-score"><strong>PSR</strong><span>Service standards</span><a href={PSR_HOME} target="_blank" rel="noreferrer">View PSR Homes</a></div>
    </div>
    <div className="review-track" aria-label="PSR service standards">{reviews.map((review) => <blockquote key={review.name}><p>{review.quote}</p><footer><strong>{review.name}</strong><span>PSR service standard</span></footer></blockquote>)}</div>
  </section>;
}
