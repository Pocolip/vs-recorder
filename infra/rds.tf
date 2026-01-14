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
