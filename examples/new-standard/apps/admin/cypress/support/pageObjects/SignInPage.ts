export default class SignInPage {
  signIn(email: string, password: string) {
    // fill inputs
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);

    // click on sign in button
    cy.get('button[type="submit"]').click();
  }
}
