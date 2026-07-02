
INSERT INTO public.compliance_checklist (category, item_name, points, sort_order) VALUES
  ('waste_segregation','Separate biodegradable and non-biodegradable bins',10,1),
  ('waste_segregation','Proper disposal of recyclables',10,2),
  ('waste_segregation','Composting of kitchen waste',5,3),
  ('waste_segregation','No burning of household waste',5,4),
  ('sanitation','Clean surroundings and yard',10,1),
  ('sanitation','Functional sanitary toilet (CR)',10,2),
  ('sanitation','Safe drinking water storage',5,3),
  ('sanitation','No stagnant water (dengue prevention)',5,4),
  ('gardening','Backyard vegetable garden',10,1),
  ('gardening','Herbal / medicinal plants',5,2),
  ('gardening','Ornamental plants maintained',5,3),
  ('ordinance','Curfew compliance for minors',5,1),
  ('ordinance','Anti-smoking in public areas',5,2),
  ('ordinance','Anti-littering compliance',5,3),
  ('ordinance','Attendance in barangay assemblies',5,4),
  ('ordinance','Registration of household pets',5,5),
  ('ordinance','No illegal structures',5,6);

INSERT INTO public.households (household_number, head_of_family, purok, address, contact_number, total_members) VALUES
  ('HH-0001','Alonzo, Ramon','Aquino','#12 Aquino St., Sambulawan','09171112201',4),
  ('HH-0002','Bautista, Elena','Marcos','#5 Marcos St., Sambulawan','09171112202',5),
  ('HH-0003','Cruz, Miguel','Macapagal','#7 Macapagal St., Sambulawan','09171112203',3),
  ('HH-0004','Delos Reyes, Carmela','Magsaysay','#10 Magsaysay St., Sambulawan','09171112204',6),
  ('HH-0005','Estrada, Nestor','Ramos','#3 Ramos St., Sambulawan','09171112205',4),
  ('HH-0006','Fernandez, Luisa','Roxas','#8 Roxas St., Sambulawan','09171112206',5),
  ('HH-0007','Garcia, Roberto','Aquino','#14 Aquino St., Sambulawan','09171112207',4),
  ('HH-0008','Hernandez, Marites','Marcos','#9 Marcos St., Sambulawan','09171112208',3),
  ('HH-0009','Ignacio, Danilo','Macapagal','#11 Macapagal St., Sambulawan','09171112209',5),
  ('HH-0010','Jimenez, Rowena','Magsaysay','#4 Magsaysay St., Sambulawan','09171112210',4),
  ('HH-0011','Lim, Antonio','Ramos','#6 Ramos St., Sambulawan','09171112211',3),
  ('HH-0012','Manalo, Rosario','Roxas','#2 Roxas St., Sambulawan','09171112212',7);
