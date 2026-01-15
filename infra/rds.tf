# RDS PostgreSQL configuration

# RDS Security Group
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for VS Recorder RDS instance"
  vpc_id      = aws_vpc.main.id

  # PostgreSQL access from EC2 only
  ingress {
    description     = "PostgreSQL from EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-db"
  engine         = "postgres"
  engine_version = "15.10"
  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Disable public access
  publicly_accessible = false

  # Backup configuration (1 day for free tier compatibility)
  backup_retention_period = 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  # Performance Insights disabled for free tier
  performance_insights_enabled = false

  # Skip final snapshot for cost savings (enable in production)
  skip_final_snapshot = true

  # Multi-AZ disabled for cost savings
  multi_az = false

  tags = {
    Name = "${var.project_name}-db"
  }
}

# Create beta database via remote-exec on EC2
# Only runs if ec2_private_key_path is provided
resource "null_resource" "create_beta_db" {
  count = var.ec2_private_key_path != "" ? 1 : 0

  depends_on = [
    aws_db_instance.main,
    aws_instance.main,
    aws_eip.main
  ]

  connection {
    type        = "ssh"
    user        = "ec2-user"
    private_key = file(var.ec2_private_key_path)
    host        = aws_eip.main.public_ip
  }

  provisioner "remote-exec" {
    inline = [
      "sleep 30",  # Wait for RDS to be fully available
      "PGPASSWORD='${var.db_password}' psql \"host=${aws_db_instance.main.address} user=${var.db_username} dbname=postgres sslmode=require\" -c \"SELECT 1 FROM pg_database WHERE datname='${var.db_name_beta}'\" | grep -q 1 || PGPASSWORD='${var.db_password}' psql \"host=${aws_db_instance.main.address} user=${var.db_username} dbname=postgres sslmode=require\" -c \"CREATE DATABASE ${var.db_name_beta};\""
    ]
  }

  triggers = {
    db_name_beta = var.db_name_beta
  }
}
