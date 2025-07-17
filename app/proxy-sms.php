<?php
// Proxy pentru API SMS - Rezolvă problema CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Răspunde la preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Citește datele trimise din frontend
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Verifică dacă datele sunt valide
    if ($input === null) {
        http_response_code(400);
        echo json_encode(['error' => 'Date invalide']);
        exit();
    }
    
    // Inițializează cURL pentru a trimite cererea către API-ul real
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://app.smso.ro/api/v1/send');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($input));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'User-Agent: SMS-Proxy/1.0'
    ]);
    
    // Execută cererea
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    // Verifică pentru erori cURL
    if ($error) {
        http_response_code(500);
        echo json_encode(['error' => 'Eroare conexiune: ' . $error]);
        exit();
    }
    
    // Setează codul de răspuns HTTP
    http_response_code($httpCode);
    
    // Returnează răspunsul de la API
    echo $response;
} else {
    // Metodă HTTP neacceptată
    http_response_code(405);
    echo json_encode(['error' => 'Metoda nu este permisă']);
}
?>
