require ["fileinto", "reject", "tag", "flag"];

# Negative and positive
if allof (not header :contains ["to"] "band@example.com",
  header :contains ["to"] "pete@example.com") {
    fileinto "/Pete";
    stop;
}

# Positive and negative
if allof (header :contains ["to"] "band@example.com",
  not header :contains ["to"] "roger@example.com") {
    fileinto "/Roger";
    stop;
}

# Negative and negative
if allof (not header :contains ["to"] "band@example.com",
  not header :contains ["to"] "john@example.com") {
    fileinto "/Other";
    stop;
}

# Positive and positive
if allof (header :contains ["to"] "keith@example.com",
  header :contains ["to"] "band@example.com") {
    fileinto "/Keith";
    stop;
}
