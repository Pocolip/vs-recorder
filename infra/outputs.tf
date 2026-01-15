# Terraform outputs

# EC2 Outputs
output "ec2_public_ip" {
  description = "Public IP of EC2 instance (Elastic IP)"
  value       = aws_eip.main.public_ip
}

output "ec2_instance_id" {
  description = "EC2 Instance ID"
  value       = aws_instance.main.id
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

# ECR Outputs
output "ecr_backend_url" {
  description = "ECR repository URL for backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  description = "ECR repository URL for frontend"
  value       = aws_ecr_repository.frontend.repository_url
}

# Useful connection strings
output "database_url" {
  description = "JDBC connection URL for production backend"
  value       = "jdbc:postgresql://${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
  sensitive   = true
}

output "database_url_beta" {
  description = "JDBC connection URL for beta backend"
  value       = "jdbc:postgresql://${aws_db_instance.main.endpoint}/${var.db_name_beta}"
  sensitive   = true
}

output "ssh_command" {
  description = "SSH command to connect to EC2"
  value       = "ssh -i <your-key>.pem ec2-user@${aws_eip.main.public_ip}"
}

output "aws_account_id" {
  description = "AWS Account ID (for ECR login)"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "AWS Region"
  value       = var.aws_region
}
