ALTER TABLE debt_payments
    ADD COLUMN payment_code VARCHAR(30) NULL;

CREATE UNIQUE INDEX uk_debt_payments_payment_code
    ON debt_payments (payment_code);
