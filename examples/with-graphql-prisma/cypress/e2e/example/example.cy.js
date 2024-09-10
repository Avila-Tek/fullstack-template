describe('Example App', () => {
  it('frontpage can be opened', () => {
    cy.visit('http://localhost:3003');
    cy.contains('Open alert');
  });
});
