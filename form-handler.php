<?php
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    // Walidacja minimalna
    $name = htmlspecialchars(trim($_POST['name'] ?? ''));
    $company = htmlspecialchars(trim($_POST['company'] ?? ''));
    $email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $phone = htmlspecialchars(trim($_POST['phone'] ?? ''));
    $message = htmlspecialchars(trim($_POST['message'] ?? ''));
    $consent = isset($_POST['consent']);

    if (!$name || !$company || !$email || !$message || !$consent) {
        header('Location: /index.html#kontakt');
        exit;
    }

    $to = "biuro@accounting-lab.pl";
    $subject = "Zapytanie ze strony – Pracownia Rachunkowości";
    $body = "Imię i nazwisko: $name\nFirma: $company\nE-mail: $email\nTelefon: $phone\n\nWiadomość:\n$message";
    $headers = "From: formularz@pracowniarachunkowosci.pl\r\nReply-To: $email\r\nContent-Type: text/plain; charset=UTF-8";

    // Wysyłka
    if (mail($to, $subject, $body, $headers)) {
        header('Location: /thank-you.html');
    } else {
        echo "Błąd podczas wysyłania. Spróbuj ponownie.";
    }
} else {
    header("HTTP/1.1 405 Method Not Allowed");
    exit;
}
