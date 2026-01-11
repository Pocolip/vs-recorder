# Route 53 DNS configuration

# Hosted zone (assumes domain is registered or transferred to Route 53)
resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = {
    Name = "${var.project_name}-zone"
  }
}

# Root domain - vsrecorder.app
resource "aws_route53_record" "root" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 300
  records = [aws_eip.main.public_ip]
}

# API subdomain - api.vsrecorder.app
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"
  ttl     = 300
  records = [aws_eip.main.public_ip]
}

# Beta subdomain - beta.vsrecorder.app
resource "aws_route53_record" "beta" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "beta.${var.domain_name}"
  type    = "A"
  ttl     = 300
  records = [aws_eip.main.public_ip]
}

# WWW redirect - www.vsrecorder.app
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.domain_name]
}
