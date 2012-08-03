dist: all
	@echo Done

all:
	@echo Compiling coffee script
	coffee -c -o ./ coffee/*.coffee

watch:
	@echo Watch coffee script files
	coffee -w -o ./ coffee/*.coffee

.PHONY: dist all watch